"""Main FastAPI application."""

import json
import logging
import traceback as tb_module
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, close_db, async_session_factory
from app.middleware.rls import RLSContextMiddleware
from app.middleware.audit import AuditMiddleware

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    # Startup
    logger.info("Starting Legal ERP Backend...")
    await init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down Legal ERP Backend...")
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Enterprise Resource Planning system for legal firms",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"],
)

# Add RLS context middleware
app.add_middleware(RLSContextMiddleware)

# Add audit logging middleware (if enabled)
if settings.enable_audit_logging:
    app.add_middleware(AuditMiddleware)


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": settings.app_version,
        "name": settings.app_name,
    }


# Root endpoint
@app.get("/", tags=["info"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Legal ERP System API",
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "docs": "/docs",
        "redoc": "/redoc",
    }


_SENSITIVE_KEYS = {"password", "token", "secret", "key", "authorization", "api_key", "access_token", "refresh_token"}


def _sanitize_body(raw: dict) -> dict:
    """Remove sensitive fields from request body before storing."""
    return {
        k: "***" if any(s in k.lower() for s in _SENSITIVE_KEYS) else v
        for k, v in raw.items()
    }


async def _save_error_log(request: Request, exc: Exception) -> None:
    """Persist an unhandled exception to error_logs. Never raises."""
    try:
        from app.models.error_log import ErrorLog

        # Try to read body (limit to 10KB)
        request_body = None
        try:
            raw_bytes = await request.body()
            if raw_bytes:
                raw_str = raw_bytes[:10_000].decode("utf-8", errors="replace")
                try:
                    parsed = json.loads(raw_str)
                    if isinstance(parsed, dict):
                        parsed = _sanitize_body(parsed)
                    request_body = json.dumps(parsed, ensure_ascii=False)[:10_000]
                except json.JSONDecodeError:
                    request_body = raw_str[:500]
        except Exception:
            pass

        user_id = getattr(request.state, "user_id", None)
        user_email = getattr(request.state, "user_email", None)
        law_firm_id = getattr(request.state, "law_firm_id", None)

        entry = ErrorLog(
            method=request.method,
            path=str(request.url.path),
            status_code=500,
            error_type=type(exc).__name__,
            error_message=str(exc)[:2000],
            traceback=tb_module.format_exc()[:10_000],
            user_id=user_id,
            user_email=user_email,
            law_firm_id=law_firm_id,
            request_body=request_body,
        )

        async with async_session_factory() as session:
            session.add(entry)
            await session.commit()
    except Exception as inner:
        logger.error(f"Failed to save error log: {inner}")


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions and persist them to error_logs."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    await _save_error_log(request, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__,
        },
    )


# Import and include all routers
from app.routers import (
    auth_router,
    law_firms_router,
    users_router,
    cases_router,
    documents_router,
    timeline_router,
    tasks_router,
    hours_router,
    alerts_router,
    clients_router,
    process_types_router,
    dashboard_router,
    client_portal_router,
)
from app.routers.processes import router as processes_router
from app.routers.billing import router as billing_router
from app.routers.emails import router as emails_router
from app.routers.notification_rules import router as notification_rules_router
from app.routers.client_alerts import router as client_alerts_router
from app.routers.ai_chat import router as ai_chat_router
from app.routers.error_logs import router as error_logs_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(law_firms_router, prefix="/api/v1/law-firms", tags=["Estudios Legales"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Usuarios"])
app.include_router(cases_router, prefix="/api/v1/cases", tags=["Casos"])
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documentos"])
app.include_router(timeline_router, prefix="/api/v1", tags=["Timeline"])
app.include_router(tasks_router, prefix="/api/v1", tags=["Tareas"])
app.include_router(processes_router, prefix="/api/v1", tags=["Procesos"])
app.include_router(hours_router, prefix="/api/v1", tags=["Horas"])
app.include_router(alerts_router, prefix="/api/v1", tags=["Alertas"])
app.include_router(clients_router, prefix="/api/v1/clients", tags=["Clientes"])
app.include_router(process_types_router, prefix="/api/v1/process-types", tags=["Tipos de Proceso"])
app.include_router(dashboard_router, prefix="/api/v1/admin", tags=["Dashboard Admin"])
app.include_router(client_portal_router, prefix="/api/v1/client", tags=["Portal Cliente"])
app.include_router(billing_router, prefix="/api/v1", tags=["Facturación"])
app.include_router(emails_router, prefix="/api/v1", tags=["Emails"])
app.include_router(notification_rules_router, prefix="/api/v1", tags=["Notificaciones"])
app.include_router(client_alerts_router, prefix="/api/v1", tags=["Alertas de Cliente"])
app.include_router(ai_chat_router, prefix="/api/v1", tags=["IA"])
app.include_router(error_logs_router, prefix="/api/v1", tags=["Error Logs"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
