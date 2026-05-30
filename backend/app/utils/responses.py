"""
Standard response format helpers.
Ensures consistent API response structure across all endpoints.
"""

from typing import Any, Dict, Optional
from datetime import datetime


def success_response(
    data: Any,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a successful API response.

    Args:
        data: Response payload
        meta: Optional metadata (timestamp, version, etc.)

    Returns:
        Dict with standard success response structure
    """
    if meta is None:
        meta = {}

    return {
        "data": data,
        "meta": {
            "timestamp": meta.get("timestamp", datetime.utcnow().isoformat()),
            "version": meta.get("version", "1.0"),
            **{k: v for k, v in meta.items() if k not in ["timestamp", "version"]},
        },
    }


def error_response(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build an error response.

    Args:
        code: Error code (e.g., "VALIDATION_ERROR", "UNAUTHORIZED")
        message: Human-readable error message
        details: Optional additional error details

    Returns:
        Dict with standard error response structure
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
        "meta": {
            "timestamp": datetime.utcnow().isoformat(),
        },
    }


def paginated_response(
    data: list,
    total: int,
    page: int,
    pages: int,
    limit: int,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a paginated response.

    Args:
        data: List of items
        total: Total count of items
        page: Current page number
        pages: Total number of pages
        limit: Items per page
        meta: Optional metadata

    Returns:
        Dict with paginated response structure
    """
    if meta is None:
        meta = {}

    return {
        "data": data,
        "meta": {
            "timestamp": meta.get("timestamp", datetime.utcnow().isoformat()),
            "version": meta.get("version", "1.0"),
            "total": total,
            "page": page,
            "pages": pages,
            "limit": limit,
            **{k: v for k, v in meta.items() if k not in ["timestamp", "version", "total", "page", "pages", "limit"]},
        },
    }


def validate_pagination(page: int, limit: int) -> tuple:
    """
    Validate and normalize pagination parameters.

    Args:
        page: Page number (minimum 1)
        limit: Items per page (minimum 1, maximum 100)

    Returns:
        Tuple of (page, limit) normalized
    """
    page = max(1, page)
    limit = max(1, min(100, limit))
    return page, limit
