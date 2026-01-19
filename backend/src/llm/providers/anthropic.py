from anthropic import Anthropic
from .base import LLMProvider

class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.client = Anthropic()
    
    def chat(self, prompt: str) -> str:
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    def chat_with_tools(self, messages: list, tools: list) -> dict:
        """Send messages with tool definitions, return full response."""
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=messages,
            tools=tools
        )
        return response

# find tools for openai