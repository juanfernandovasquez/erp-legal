"""Database configuration and session management."""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy import text
from typing import AsyncGenerator
from contextlib import asynccontextmanager

# Module-level engine (initialized in init_db)
engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    """Initialize database engine and session factory."""
    global engine, async_session_factory

    from app.config import get_settings
    s = get_settings()

    engine = create_async_engine(
        s.database_url,
        echo=s.database_echo,
        pool_pre_ping=True,
    )

    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


async def close_db() -> None:
    """Close database connections."""
    global engine
    if engine:
        await engine.dispose()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency to get async database session.
    RLS context is set by the RLS middleware based on JWT token.
    """
    if async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context(law_firm_id: str | None = None) -> AsyncGenerator[AsyncSession, None]:
    """Context manager for getting a database session (for services/CRON jobs)."""
    if async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    async with async_session_factory() as session:
        if law_firm_id:
            await session.execute(
                text(f"SET LOCAL app.current_law_firm_id = '{law_firm_id}'")
            )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
