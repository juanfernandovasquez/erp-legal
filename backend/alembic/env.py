"""Alembic environment script."""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, create_engine

from alembic import context

# This is the Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def get_url() -> str:
    """
    Read DATABASE_URL from environment (or app settings) and convert
    the asyncpg driver to psycopg2 so Alembic can use a sync connection.
    """
    # Try the environment variable directly first
    url = os.environ.get("DATABASE_URL", "")

    # Fall back to loading via the app settings
    if not url:
        try:
            from app.config import get_settings
            url = get_settings().database_url
        except Exception:
            pass

    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. "
            "Pass it as an env var or define it in .env / app settings."
        )

    # Alembic needs a synchronous driver.
    # Replace asyncpg with psycopg2 (standard sync PostgreSQL driver).
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgresql+aiopg://", "postgresql://")

    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(get_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
