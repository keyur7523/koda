import os
from dotenv import load_dotenv
from .providers import LLMProvider, AnthropicProvider, OpenAIProvider

load_dotenv()

SUPPORTED_PROVIDERS = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
}

def get_provider() -> LLMProvider:
    """Return the appropriate LLM provider based on environment config."""
    provider_name = os.getenv("LLM_PROVIDER", "openai").lower()
    
    if provider_name not in SUPPORTED_PROVIDERS:
        supported = ", ".join(SUPPORTED_PROVIDERS.keys())
        raise ValueError(f"Unknown LLM provider '{provider_name}'. Supported: {supported}")
    
    return SUPPORTED_PROVIDERS[provider_name]()

def chat(prompt: str) -> str:
    """Convenience function to chat using the configured provider."""
    provider = get_provider()
    return provider.chat(prompt)