from openai import OpenAI
from .base import LLMProvider
from typing import Callable

# Phase-based model selection (OpenAI uses same model for all phases for now)
DEFAULT_MODEL = "gpt-4o"


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, on_usage: Callable[[int, int], None] | None = None):
        # If api_key is provided, use it; otherwise OpenAI() uses env var
        if api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            self.client = OpenAI()
        self._on_usage = on_usage
    
    def _report_usage(self, response):
        """Report token usage if callback is set."""
        if self._on_usage and hasattr(response, 'usage') and response.usage:
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            self._on_usage(input_tokens, output_tokens)
    
    def chat(self, prompt: str, phase: str | None = None) -> str:
        # OpenAI uses same model for all phases (could be extended later)
        response = self.client.chat.completions.create(
            model=DEFAULT_MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        self._report_usage(response)
        return response.choices[0].message.content
    
    def chat_with_tools(self, messages: list, tools: list, phase: str | None = None) -> dict:
        """Send messages with tool definitions (OpenAI format).
        
        Note: OpenAI tool format differs from Anthropic. This is a placeholder
        that would need proper implementation for tool use.
        """
        # For now, just do a regular chat (tool support would need conversion)
        response = self.client.chat.completions.create(
            model=DEFAULT_MODEL,
            max_tokens=4096,
            messages=messages
        )
        self._report_usage(response)
        return response