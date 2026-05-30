from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.audit import log_audit
from app.database import async_session_factory


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all requests to audit_logs table.
    """

    # Paths to skip audit logging
    SKIP_PATHS = {
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
        "/metrics",
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        """Log request and response."""
        # Skip certain paths
        if any(request.url.path.startswith(path) for path in self.SKIP_PATHS):
            return await call_next(request)

        # Start timing
        start_time = time.time()

        # Get user info from request state (set by auth middleware)
        user_id: Optional[uuid.UUID] = getattr(request.state, "user_id", None)
        law_firm_id: Optional[uuid.UUID] = getattr(request.state, "law_firm_id", None)

        # Get request info
        http_method = request.method
        endpoint = request.url.path
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Process request
        try:
            response = await call_next(request)
            status_code = response.status.code if hasattr(response, "status") else response.status_code
            error_message = None
        except Exception as e:
            status_code = 500
            error_message = str(e)
            raise

        # Calculate processing time
        process_time = time.time() - start_time

        # Log to audit table (if law_firm_id is available)
        if law_firm_id:
            try:
                async with async_session_factory() as session:
                    # Determine resource type and action from endpoint and method
                    resource_type = _get_resource_type(endpoint)
                    action = _get_action_from_method(http_method)

                    await log_audit(
                        session=session,
                        law_firm_id=law_firm_id,
                        user_id=user_id,
                        action=action,
                        resource_type=resource_type,
                        http_method=http_method,
                        endpoint=endpoint,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        status_code=status_code,
                        error_message=error_message,
                    )
                    await session.commit()
            except Exception:
                # Don't let audit logging errors break the request
                pass

        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)

        return response


def _get_action_from_method(method: str) -> str:
    """Map HTTP method to audit action."""
    method_map = {
        "GET": "read",
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete",
    }
    return method_map.get(method, "unknown")


def _get_resource_type(endpoint: str) -> str:
    """Extract resource type from endpoint path."""
    parts = endpoint.strip("/").split("/")

    if not parts:
        return "unknown"

    # Get the first meaningful part
    resource_type = parts[0]

    # Remove 'api' prefix if present
    if resource_type == "api" and len(parts) > 1:
        resource_type = parts[1]

    # Singularize common plural forms
    if resource_type.endswith("ies"):
        resource_type = resource_type[:-3] + "y"
    elif resource_type.endswith("s"):
        resource_type = resource_type[:-1]

    return resource_type
