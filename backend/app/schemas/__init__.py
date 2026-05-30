from app.schemas.auth import (
    TokenResponse,
    TokenPayload,
    LoginRequest,
    GoogleOAuth2Request,
    RefreshTokenRequest,
    UserRegistrationRequest,
    ChangePasswordRequest,
    ResetPasswordRequest,
    ConfirmPasswordResetRequest,
    EnableMFARequest,
    VerifyMFARequest,
    DisableMFARequest,
    LogoutRequest,
)

from app.schemas.law_firm import (
    LawFirmCreate,
    LawFirmUpdate,
    LawFirmResponse,
    LawFirmListResponse,
)

from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserProfileResponse,
    SetPasswordRequest,
    UpdateProfileRequest,
)

from app.schemas.case import (
    CaseCreate,
    CaseUpdate,
    CaseResponse,
    CaseListResponse,
)

from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListResponse,
    DocumentMetadataResponse,
)

from app.schemas.timeline import (
    CaseEventCreate,
    CaseEventUpdate,
    CaseEventResponse,
    CaseUpdateCreate,
    CaseUpdateResponse,
)

from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    CaseHoursCreate,
    CaseHoursResponse,
)

from app.schemas.alert import (
    CaseAlertCreate,
    CaseAlertUpdate,
    CaseAlertResponse,
    LegalRegistryCreate,
    LegalRegistryUpdate,
    LegalRegistryResponse,
)

from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
)

__all__ = [
    # Auth
    "TokenResponse",
    "TokenPayload",
    "LoginRequest",
    "GoogleOAuth2Request",
    "RefreshTokenRequest",
    "UserRegistrationRequest",
    "ChangePasswordRequest",
    "ResetPasswordRequest",
    "ConfirmPasswordResetRequest",
    "EnableMFARequest",
    "VerifyMFARequest",
    "DisableMFARequest",
    "LogoutRequest",
    # Law Firm
    "LawFirmCreate",
    "LawFirmUpdate",
    "LawFirmResponse",
    "LawFirmListResponse",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "UserProfileResponse",
    "SetPasswordRequest",
    "UpdateProfileRequest",
    # Case
    "CaseCreate",
    "CaseUpdate",
    "CaseResponse",
    "CaseListResponse",
    # Document
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentMetadataResponse",
    # Timeline
    "CaseEventCreate",
    "CaseEventUpdate",
    "CaseEventResponse",
    "CaseUpdateCreate",
    "CaseUpdateResponse",
    # Task
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "CaseHoursCreate",
    "CaseHoursResponse",
    # Alert
    "CaseAlertCreate",
    "CaseAlertUpdate",
    "CaseAlertResponse",
    "LegalRegistryCreate",
    "LegalRegistryUpdate",
    "LegalRegistryResponse",
    # Client
    "ClientCreate",
    "ClientUpdate",
    "ClientResponse",
    "ClientListResponse",
]
