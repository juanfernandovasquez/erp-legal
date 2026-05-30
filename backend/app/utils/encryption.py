from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import os
import base64
from typing import Optional

from app.config import settings


def _get_kms_key(key_id: str) -> bytes:
    """
    Retrieve encryption key from KMS or environment.
    In production, this would call AWS KMS.
    For now, use environment variable with key ID as fallback.
    """
    # In production, call AWS KMS
    # For development, use environment variable
    env_key = os.getenv(f"ENCRYPTION_KEY_{key_id}")
    if env_key:
        return base64.b64decode(env_key)

    # Fallback to AWS KMS
    # This would require boto3 and AWS credentials
    raise ValueError(f"Encryption key {key_id} not found")


def encrypt_field(value: str, key_id: str) -> str:
    """
    Encrypt a field value using AES-256-GCM.
    Returns base64-encoded ciphertext with IV.
    """
    if not value:
        return ""

    # Generate random IV (12 bytes for GCM)
    iv = os.urandom(12)

    # Get encryption key
    key = _get_kms_key(key_id)

    # Create cipher
    cipher = AESGCM(key)

    # Encrypt
    ciphertext = cipher.encrypt(iv, value.encode("utf-8"), None)

    # Combine IV + ciphertext and encode
    encrypted_data = iv + ciphertext
    return base64.b64encode(encrypted_data).decode("utf-8")


def decrypt_field(encrypted_value: str, key_id: str) -> str:
    """
    Decrypt a field value that was encrypted with AES-256-GCM.
    """
    if not encrypted_value:
        return ""

    try:
        # Decode from base64
        encrypted_data = base64.b64decode(encrypted_value.encode("utf-8"))

        # Extract IV (first 12 bytes)
        iv = encrypted_data[:12]
        ciphertext = encrypted_data[12:]

        # Get decryption key
        key = _get_kms_key(key_id)

        # Create cipher
        cipher = AESGCM(key)

        # Decrypt
        plaintext = cipher.decrypt(iv, ciphertext, None)

        return plaintext.decode("utf-8")
    except Exception as e:
        raise ValueError(f"Failed to decrypt field: {str(e)}")


def hash_field(value: str, salt: Optional[str] = None) -> str:
    """
    Hash a field value using PBKDF2 for additional security.
    """
    if not value:
        return ""

    if salt is None:
        salt = os.urandom(16)
    else:
        salt = salt.encode("utf-8")

    # PBKDF2 with SHA256
    kdf = PBKDF2(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )

    hash_bytes = kdf.derive(value.encode("utf-8"))
    hash_with_salt = salt + hash_bytes

    return base64.b64encode(hash_with_salt).decode("utf-8")


def verify_hash(value: str, hashed: str) -> bool:
    """
    Verify a value against its hash.
    """
    try:
        # Decode hashed value
        hash_with_salt = base64.b64decode(hashed.encode("utf-8"))

        # Extract salt (first 16 bytes)
        salt = hash_with_salt[:16]

        # Hash the input value with the same salt
        recomputed_hash = hash_field(value, salt.decode("utf-8"))

        # Compare
        return recomputed_hash == hashed
    except Exception:
        return False


def encrypt_dictionary(data: dict, key_id: str, fields_to_encrypt: list[str]) -> dict:
    """
    Encrypt specific fields in a dictionary.
    """
    encrypted_data = data.copy()

    for field in fields_to_encrypt:
        if field in encrypted_data and encrypted_data[field]:
            encrypted_data[field] = encrypt_field(encrypted_data[field], key_id)

    return encrypted_data


def decrypt_dictionary(data: dict, key_id: str, fields_to_decrypt: list[str]) -> dict:
    """
    Decrypt specific fields in a dictionary.
    """
    decrypted_data = data.copy()

    for field in fields_to_decrypt:
        if field in decrypted_data and decrypted_data[field]:
            decrypted_data[field] = decrypt_field(decrypted_data[field], key_id)

    return decrypted_data
