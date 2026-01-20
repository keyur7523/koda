"""
Encryption utilities for sensitive data at rest.
Uses Fernet symmetric encryption (AES-128-CBC with HMAC).
"""
import os
from cryptography.fernet import Fernet, InvalidToken


def _get_fernet() -> Fernet:
    """Get Fernet instance with key from environment."""
    key = os.getenv("ENCRYPTION_KEY")
    print(f"DEBUG: ENCRYPTION_KEY exists: {bool(key)}, length: {len(key) if key else 0}")
    if not key:
        raise ValueError(
            "ENCRYPTION_KEY environment variable is not set. "
            "This is required to encrypt/decrypt API keys."
        )
    try:
        return Fernet(key.encode())
    except Exception as e:
        raise ValueError(f"ENCRYPTION_KEY is invalid: {e}")

def encrypt(plain_text: str) -> str:
    """
    Encrypt a string using Fernet (AES-128-CBC).
    
    Args:
        plain_text: The string to encrypt
        
    Returns:
        Base64-encoded ciphertext as string
    """
    if not plain_text:
        return ""
    
    fernet = _get_fernet()
    encrypted = fernet.encrypt(plain_text.encode())
    return encrypted.decode()

def decrypt(cipher_text: str) -> str:
    """
    Decrypt a Fernet-encrypted string.

    Args:
        cipher_text: Base64-encoded ciphertext

    Returns:
        Decrypted plain text string

    Raises:
        ValueError: If decryption fails (invalid key or corrupted data)
    """
    if not cipher_text:
        return ""

    try:
        fernet = _get_fernet()
        decrypted = fernet.decrypt(cipher_text.encode())
        return decrypted.decode()
    except InvalidToken:
        raise ValueError(
            "Failed to decrypt: ENCRYPTION_KEY has changed since the data was encrypted. "
            "The stored API key cannot be recovered and must be re-added."
        )

