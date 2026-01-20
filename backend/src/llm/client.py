import os
from pathlib import Path
from dotenv import load_dotenv
from .providers import LLMProvider, AnthropicProvider, OpenAIProvider

def load_env():
    """Load environment from multiple locations."""
    # 1. Current directory .env
    load_dotenv()
    
    # 2. Home directory ~/.koda/.env (global config)
    home_env = Path.home() / ".koda" / ".env"
    if home_env.exists():
        load_dotenv(home_env, override=False)

# Load on import
load_env()

SUPPORTED_PROVIDERS = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
}

from typing import Callable

def get_provider(
    api_key: str | None = None,
    on_usage: Callable[[int, int], None] | None = None
) -> LLMProvider:
    """Return the appropriate LLM provider based on environment config.
    
    Args:
        api_key: Optional API key to use instead of environment variable
        on_usage: Optional callback(input_tokens, output_tokens) for tracking
    """
    provider_name = os.getenv("LLM_PROVIDER", "anthropic").lower()
    
    if provider_name not in SUPPORTED_PROVIDERS:
        supported = ", ".join(SUPPORTED_PROVIDERS.keys())
        raise ValueError(f"Unknown LLM provider '{provider_name}'. Supported: {supported}")
    
    # Check for API key (skip if custom key provided)
    if not api_key:
        if provider_name == "anthropic" and not os.getenv("ANTHROPIC_API_KEY"):
            raise ValueError(
                "ANTHROPIC_API_KEY not found. Set it in:\n"
                "  - .env in current directory, or\n"
                "  - ~/.koda/.env for global config"
            )
        if provider_name == "openai" and not os.getenv("OPENAI_API_KEY"):
            raise ValueError(
                "OPENAI_API_KEY not found. Set it in:\n"
                "  - .env in current directory, or\n"
                "  - ~/.koda/.env for global config"
            )
    
    return SUPPORTED_PROVIDERS[provider_name](api_key=api_key, on_usage=on_usage)

def chat(prompt: str, api_key: str | None = None, on_usage: Callable[[int, int], None] | None = None) -> str:
    """Convenience function to chat using the configured provider."""
    provider = get_provider(api_key=api_key, on_usage=on_usage)
    return provider.chat(prompt)

def chat_with_tools(
    messages: list,
    tools: list,
    api_key: str | None = None,
    on_usage: Callable[[int, int], None] | None = None
) -> dict:
    """Chat with tool support using the configured provider."""
    provider = get_provider(api_key=api_key, on_usage=on_usage)
    return provider.chat_with_tools(messages, tools)
