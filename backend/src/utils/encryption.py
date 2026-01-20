"""
Encryption utilities for sensitive data at rest.
Uses Fernet symmetric encryption (AES-128-CBC with HMAC).
"""
import os
from cryptography.fernet import Fernet, InvalidToken

def _get_fernet() -> Fernet:
    """Get Fernet instance with key from environment."""
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise ValueError(
            "ENCRYPTION_KEY not found. Generate one with:\n"
            "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"\n"
            "Then add it to ~/.koda/.env"
        )
    return Fernet(key.encode())

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
        raise ValueError("Failed to decrypt: invalid key or corrupted data")

