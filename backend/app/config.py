"""Application configuration."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 40
    database_echo: bool = False

    # FastAPI
    environment: str = "development"
    debug: bool = False
    app_name: str = "ERP Legal"
    app_version: str = "1.0.0"
    api_description: str = "Enterprise Resource Planning system for legal firms"

    # Audit
    enable_audit_logging: bool = True

    # JWT & Security
    secret_key: str
    jwt_secret_key: str = ""  # Will fall back to secret_key if empty
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 1  # access token expiration (30 minutes in seconds = 0.5 hours, but using 1 for practical)
    jwt_refresh_expiration_days: int = 7
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    password_min_length: int = 8
    password_require_uppercase: bool = False
    password_require_numbers: bool = False
    password_require_special_chars: bool = False

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: str = "noreply@legainerp.com"
    smtp_tls: bool = True

    # Brevo
    brevo_api_key: Optional[str] = None

    # AWS S3
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket_name: str = "erp-legal-documents"
    aws_s3_region: str = "us-east-1"
    aws_s3_endpoint_url: str = "https://s3.amazonaws.com"

    # WhatsApp API
    whatsapp_api_token: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_business_account_id: Optional[str] = None

    # Logging & Monitoring
    log_level: str = "INFO"
    sentry_dsn: Optional[str] = None
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = 1.0

    # Frontend
    react_app_api_url: str = "http://localhost:8000"
    react_app_api_timeout: int = 30000

    # IA/ML (Phase 2)
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4-turbo"
    anthropic_api_key: Optional[str] = None

    # Redis (optional)
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600

    # File upload limits
    max_file_size_mb: int = 100
    allowed_file_types: list[str] = ["pdf", "doc", "docx", "xlsx", "txt", "jpg", "png"]

    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100

    # Timezone
    timezone: str = "America/Lima"

    class Config:
        """Pydantic settings configuration."""

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    s = Settings()
    # Ensure jwt_secret_key falls back to secret_key if not explicitly set
    if not s.jwt_secret_key:
        s.jwt_secret_key = s.secret_key
    return s


# Lazy proxy so 'from app.config import settings' works at import time
class _SettingsProxy:
    def __getattr__(self, name):
        return getattr(get_settings(), name)

settings = _SettingsProxy()
