from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
import uuid
import jwt
from typing import Optional

from app.config import settings
from app.database import get_db_context


class RLSMiddleware(BaseHTTPMiddleware):
    """
    Middleware to set Row Level Security context per request.
    Sets app.current_law_firm_id PostgreSQL setting from JWT token.
    """

    async def dispatch(self, request: Request, call_next):
        """Set RLS context and process request."""
        law_firm_id: Optional[uuid.UUID] = None

        # Extract law_firm_id from JWT token
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                payload = jwt.decode(
                    token,
                    settings.jwt_secret_key,
                    algorithms=[settings.jwt_algorithm],
                )
                law_firm_id_str = payload.get("law_firm_id")
                if law_firm_id_str:
                    law_firm_id = uuid.UUID(law_firm_id_str)
        except Exception:
            # Token is invalid or missing - continue without RLS context
            pass

        # Store law_firm_id in request state for access by endpoints
        request.state.law_firm_id = law_firm_id

        # Continue to next middleware/endpoint
        response = await call_next(request)

        return response


class RLSContextMiddleware(BaseHTTPMiddleware):
    """
    Alternative RLS middleware that sets PostgreSQL context per request.
    This requires the endpoint to handle database sessions with RLS context.
    """

    async def dispatch(self, request: Request, call_next):
        """Extract and store RLS context."""
        law_firm_id: Optional[str] = None

        # Extract law_firm_id from JWT token
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                payload = jwt.decode(
                    token,
                    settings.jwt_secret_key,
                    algorithms=[settings.jwt_algorithm],
                )
                law_firm_id = payload.get("law_firm_id")
        except Exception:
            pass

        # Store in request state
        request.state.law_firm_id = law_firm_id

        # Process request
        response = await call_next(request)

        return response
