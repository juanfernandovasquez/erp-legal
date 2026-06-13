"""Main FastAPI application."""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, close_db
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
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
