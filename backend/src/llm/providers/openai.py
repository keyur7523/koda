from openai import OpenAI
from .base import LLMProvider
from typing import Callable

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
    
    def chat(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        self._report_usage(response)
        return response.choices[0].message.content