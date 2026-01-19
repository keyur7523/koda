from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def chat(self, prompt: str) -> str:
        """Send a prompt and return the response."""
        pass

    @abstractmethod
    def chat_with_tools(self, messages: list, tools: list) -> dict:
        """Send messages with tool definitions, return full response."""
        pass