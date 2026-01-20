from anthropic import Anthropic
from .base import LLMProvider
from typing import Callable

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
    
    def chat(self, prompt: str) -> str:
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        self._report_usage(message)
        return message.content[0].text

    def chat_with_tools(self, messages: list, tools: list) -> dict:
        """Send messages with tool definitions, return full response."""
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=messages,
            tools=tools
        )
        self._report_usage(response)
        return response