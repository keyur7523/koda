from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def chat(self, prompt: str, phase: str | None = None) -> str:
        """Send a prompt and return the response.
        
        Args:
            prompt: The prompt to send
            phase: Optional phase hint for model selection
        """
        pass

    @abstractmethod
    def chat_with_tools(self, messages: list, tools: list, phase: str | None = None) -> dict:
        """Send messages with tool definitions, return full response.
        
        Args:
            messages: Conversation messages
            tools: Tool schemas
            phase: Optional phase hint for model selection
        """
        pass