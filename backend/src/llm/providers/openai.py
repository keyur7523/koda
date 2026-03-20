from openai import OpenAI
from .base import LLMProvider
from typing import Callable

# Phase-based model selection for OpenAI
PHASE_MODELS = {
    "understanding": "gpt-4o-mini",   # Cheaper for exploration
    "planning": "gpt-4o",             # Smart for planning
    "executing": "gpt-4o",            # Smart for code changes
}
DEFAULT_MODEL = "gpt-4o"


class _AnthropicCompatResponse:
    """Wraps an OpenAI response to match the Anthropic response format
    expected by the agent orchestrator (stop_reason, content blocks)."""

    def __init__(self, openai_response):
        self._raw = openai_response
        message = openai_response.choices[0].message

        # Map OpenAI finish_reason to Anthropic stop_reason
        finish = openai_response.choices[0].finish_reason
        if finish == "tool_calls":
            self.stop_reason = "tool_use"
        else:
            self.stop_reason = "end_turn"

        # Build Anthropic-style content blocks
        self.content = []

        if message.content:
            self.content.append(_TextBlock(message.content))

        if message.tool_calls:
            for tc in message.tool_calls:
                import json
                self.content.append(_ToolUseBlock(
                    id=tc.id,
                    name=tc.function.name,
                    input=json.loads(tc.function.arguments),
                ))


class _TextBlock:
    """Mimics Anthropic TextBlock."""
    def __init__(self, text: str):
        self.type = "text"
        self.text = text


class _ToolUseBlock:
    """Mimics Anthropic ToolUseBlock."""
    def __init__(self, id: str, name: str, input: dict):
        self.type = "tool_use"
        self.id = id
        self.name = name
        self.input = input


def _convert_tools_to_openai(anthropic_tools: list) -> list:
    """Convert Anthropic tool schemas to OpenAI function-calling format."""
    openai_tools = []
    for tool in anthropic_tools:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "parameters": tool.get("input_schema", {}),
            },
        })
    return openai_tools


def _convert_messages_to_openai(anthropic_messages: list) -> list:
    """Convert Anthropic-style messages to OpenAI format.

    Handles:
    - Plain string content → as-is
    - Assistant messages with tool_use content blocks → tool_calls
    - User messages with tool_result content blocks → tool messages
    """
    openai_msgs = []
    for msg in anthropic_messages:
        role = msg["role"]
        content = msg["content"]

        # Simple string content
        if isinstance(content, str):
            openai_msgs.append({"role": role, "content": content})
            continue

        # List of content blocks (Anthropic style)
        if isinstance(content, list):
            if role == "assistant":
                # Extract text and tool calls
                text_parts = []
                tool_calls = []
                for block in content:
                    if hasattr(block, "type"):
                        if block.type == "text":
                            text_parts.append(block.text)
                        elif block.type == "tool_use":
                            import json
                            tool_calls.append({
                                "id": block.id,
                                "type": "function",
                                "function": {
                                    "name": block.name,
                                    "arguments": json.dumps(block.input),
                                },
                            })
                assistant_msg = {"role": "assistant", "content": "\n".join(text_parts) or None}
                if tool_calls:
                    assistant_msg["tool_calls"] = tool_calls
                openai_msgs.append(assistant_msg)

            elif role == "user":
                # Could be tool_result blocks or regular content
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        openai_msgs.append({
                            "role": "tool",
                            "tool_call_id": block["tool_use_id"],
                            "content": block["content"],
                        })
                    elif isinstance(block, dict) and block.get("type") == "text":
                        openai_msgs.append({"role": "user", "content": block["text"]})
                    elif isinstance(block, str):
                        openai_msgs.append({"role": "user", "content": block})
            continue

        # Fallback
        openai_msgs.append({"role": role, "content": str(content)})

    return openai_msgs


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, on_usage: Callable[[int, int], None] | None = None):
        if api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            self.client = OpenAI()
        self._on_usage = on_usage

    def _get_model(self, phase: str | None = None) -> str:
        if phase and phase in PHASE_MODELS:
            return PHASE_MODELS[phase]
        return DEFAULT_MODEL

    def _report_usage(self, response):
        """Report token usage if callback is set."""
        if self._on_usage and hasattr(response, 'usage') and response.usage:
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            self._on_usage(input_tokens, output_tokens)

    def chat(self, prompt: str, phase: str | None = None) -> str:
        model = self._get_model(phase)
        response = self.client.chat.completions.create(
            model=model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        self._report_usage(response)
        return response.choices[0].message.content

    def chat_with_tools(self, messages: list, tools: list, phase: str | None = None):
        """Send messages with tool definitions, return Anthropic-compatible response.

        Converts Anthropic tool schemas and message formats to OpenAI's
        function-calling format, then wraps the response so the orchestrator
        can consume it identically to an Anthropic response.
        """
        model = self._get_model(phase)
        openai_tools = _convert_tools_to_openai(tools)
        openai_messages = _convert_messages_to_openai(messages)

        response = self.client.chat.completions.create(
            model=model,
            max_tokens=4096,
            messages=openai_messages,
            tools=openai_tools if openai_tools else None,
        )
        self._report_usage(response)
        return _AnthropicCompatResponse(response)