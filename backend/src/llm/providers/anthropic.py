from anthropic import Anthropic
from .base import LLMProvider
from typing import Callable

# Phase-based model selection for token optimization
# - Haiku: Fast and cheap for exploration/understanding
# - Sonnet: Smart for planning and execution
PHASE_MODELS = {
    "understanding": "claude-3-5-haiku-20241022",  # Cheap, fast for exploration
    "planning": "claude-sonnet-4-20250514",        # Smart for planning
    "executing": "claude-sonnet-4-20250514",       # Smart for code changes
}
DEFAULT_MODEL = "claude-sonnet-4-20250514"


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, on_usage: Callable[[int, int], None] | None = None):
        # If api_key is provided, use it; otherwise Anthropic() uses env var
        if api_key:
            self.client = Anthropic(api_key=api_key)
        else:
            self.client = Anthropic()
        self._on_usage = on_usage  # Callback for token usage tracking
    
    def _report_usage(self, response):
        """Report token usage if callback is set."""
        if self._on_usage and hasattr(response, 'usage'):
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            self._on_usage(input_tokens, output_tokens)
    
    def _get_model(self, phase: str | None = None) -> str:
        """Get the appropriate model for the given phase."""
        if phase and phase in PHASE_MODELS:
            return PHASE_MODELS[phase]
        return DEFAULT_MODEL
    
    def chat(self, prompt: str, phase: str | None = None) -> str:
        model = self._get_model(phase)
        message = self.client.messages.create(
            model=model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        self._report_usage(message)
        return message.content[0].text

    def chat_with_tools(self, messages: list, tools: list, phase: str | None = None) -> dict:
        """Send messages with tool definitions, return full response.
        
        Args:
            messages: Conversation messages
            tools: Tool schemas
            phase: Optional phase hint for model selection 
                   ("understanding", "planning", "executing")
        """
        model = self._get_model(phase)
        response = self.client.messages.create(
            model=model,
            max_tokens=4096,
            messages=messages,
            tools=tools
        )
        self._report_usage(response)
        return response