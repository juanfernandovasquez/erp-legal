"""
Services package for business logic and external integrations.
"""

from .case_service import (
    validate_case_hierarchy,
    check_parent_can_close,
    generate_case_number,
    check_case_team_access,
)
from .document_service import (
    generate_presigned_upload_url,
    generate_presigned_download_url,
    validate_document_file,
    calculate_file_hash,
)
from .alert_service import process_pending_alerts
from .audit_service import audit_log

__all__ = [
    "validate_case_hierarchy",
    "check_parent_can_close",
    "generate_case_number",
    "check_case_team_access",
    "generate_presigned_upload_url",
    "generate_presigned_download_url",
    "validate_document_file",
    "calculate_file_hash",
    "process_pending_alerts",
    "audit_log",
]
