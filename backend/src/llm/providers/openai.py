from openai import OpenAI
from .base import LLMProvider

class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.client = OpenAI()
    
    def chat(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content