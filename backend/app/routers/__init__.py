"""
Router package for Legal ERP API endpoints.
"""

from .auth import router as auth_router
from .law_firms import router as law_firms_router
from .users import router as users_router
from .cases import router as cases_router
from .documents import router as documents_router
from .timeline import router as timeline_router
from .tasks import router as tasks_router
from .hours import router as hours_router
from .alerts import router as alerts_router
from .clients import router as clients_router
from .process_types import router as process_types_router
from .dashboard import router as dashboard_router
from .client_portal import router as client_portal_router

__all__ = [
    "auth_router",
    "law_firms_router",
    "users_router",
    "cases_router",
    "documents_router",
    "timeline_router",
    "tasks_router",
    "hours_router",
    "alerts_router",
    "clients_router",
    "process_types_router",
    "dashboard_router",
    "client_portal_router",
]
