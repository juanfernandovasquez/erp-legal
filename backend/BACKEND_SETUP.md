# Legal ERP Backend - Setup & Architecture

## Overview

This is a production-ready Legal ERP backend built with Python 3.11+, FastAPI, SQLAlchemy (async), and PostgreSQL 14+ with Row Level Security (RLS).

## Architecture

### Technology Stack

- **Framework**: FastAPI (async)
- **Database**: PostgreSQL 14+ with RLS
- **ORM**: SQLAlchemy 2.0+ (async with asyncpg)
- **Authentication**: JWT + OAuth2 (Google)
- **Encryption**: AES-256-GCM for sensitive data
- **Cloud Storage**: AWS S3
- **Key Management**: AWS KMS

### Project Structure

```
app/
├── config.py                 # Application settings (pydantic-settings)
├── database.py              # Async SQLAlchemy setup & RLS context
├── main.py                  # FastAPI app with middleware & routers
├── dependencies.py          # Common dependencies (auth, roles, etc.)
│
├── models/
│   ├── __init__.py         # Export all models
│   ├── base.py             # Base model with standard fields
│   ├── law_firm.py         # LawFirm (tenant)
│   ├── user.py             # User with roles
│   ├── case.py             # Case & team management
│   ├── document.py         # Documents & metadata
│   ├── timeline.py         # Case events & updates
│   ├── task.py             # Tasks, hours, invoicing
│   ├── alert.py            # Alerts & registries
│   ├── process_type.py     # Legal process types
│   ├── credential.py       # Encrypted external credentials
│   ├── client.py           # Clients
│   └── audit.py            # Audit logs & AI analysis
│
├── schemas/
│   ├── __init__.py         # Export all schemas
│   ├── auth.py             # Login, tokens, MFA
│   ├── law_firm.py         # Law firm CRUD schemas
│   ├── user.py             # User CRUD schemas
│   ├── case.py             # Case CRUD schemas
│   ├── document.py         # Document schemas
│   ├── timeline.py         # Event & update schemas
│   ├── task.py             # Task & hours schemas
│   ├── alert.py            # Alert & registry schemas
│   └── client.py           # Client schemas
│
├── utils/
│   ├── __init__.py         # Utils package
│   ├── security.py         # JWT, password hashing, OAuth2 scheme
│   ├── encryption.py       # AES-256-GCM encryption/decryption
│   └── audit.py            # Audit logging utility
│
└── middleware/
    ├── __init__.py         # Middleware package
    ├── rls.py              # Row Level Security context
    └── audit.py            # Request audit logging
```

## Database Schema Features

### All Tables Include

- **id**: UUID primary key
- **created_at**: Creation timestamp (server default)
- **updated_at**: Update timestamp (auto-updated)
- **created_by**: User ID who created the record
- **updated_by**: User ID who last updated
- **is_deleted**: Soft delete flag
- **deleted_at**: Soft delete timestamp
- **deleted_by**: User ID who deleted

**Exception**: `audit_logs`, `ia_analysis_results`, `ia_audit_logs`, `ia_feedback`, and `anonimizacion_rules` do NOT have soft delete fields (permanent records for compliance).

### Multi-Tenancy

Every query must filter by `law_firm_id` for data isolation.

Row Level Security (RLS) is enforced at the database level:
- Each tenant-aware table has an RLS policy
- Queries are automatically scoped to the current law firm
- Set via `SET app.current_law_firm_id` in the database session

### Key Tables

#### Core Entities
- **law_firms**: Organizations (tenants)
- **users**: Users with roles (super_admin, admin_firma, abogado_senior, abogado_junior, administrativo, revisor_externo)

#### Case Management
- **cases**: Legal cases with parent/child hierarchy
- **case_teams**: Team members assigned to cases
- **case_team_history**: Audit trail of team changes
- **external_reviewers**: External access to cases
- **case_clients**: Client assignments to cases
- **case_events**: Timeline events (hearings, deadlines, etc.)
- **case_updates**: Internal updates & status changes

#### Documentation
- **documents**: Files with versioning & encryption
- **document_metadata**: Extracted metadata from documents

#### Task & Time Management
- **tasks**: Work items with hierarchy
- **case_hours**: Time tracking & billing
- **invoice_metrics**: Billing aggregates
- **task_schedules**: Recurring tasks

#### Alerts & Compliance
- **case_alerts**: Notifications (deadline, payment due, etc.)
- **legal_registries**: Regulatory submissions & checklists
- **process_types**: Court procedures & legal processes

#### External Integration
- **external_credentials**: Encrypted API keys, tokens (AES-256-GCM)

#### Clients
- **clients**: Law firm's clients (individuals, businesses, etc.)

#### Audit & AI
- **audit_logs**: Immutable audit trail (no soft delete)
- **ia_analysis_results**: AI document analysis results
- **ia_audit_logs**: AI activity audit trail
- **ia_feedback**: User feedback on AI results
- **anonimizacion_rules**: Rules for anonymizing sensitive data

## Authentication

### JWT Token Structure

```python
{
    "sub": "user-id",              # User UUID
    "law_firm_id": "firm-id",      # Law firm UUID
    "role": "abogado_senior",      # User role
    "exp": "2024-01-01T00:00:00Z", # Expiration
    "iat": "2024-01-01T00:00:00Z", # Issued at
    "type": "access"               # "access" or "refresh"
}
```

### Login Flow

1. User provides email + password
2. Server validates credentials
3. Server creates JWT access token (24 hours default)
4. Server creates JWT refresh token (7 days default)
5. Client stores both tokens
6. Client includes access token in Authorization header: `Bearer <token>`
7. When access token expires, client uses refresh token to get new access token

### Google OAuth2

1. Client obtains Google ID token from Google SDK
2. Client sends ID token to `/api/auth/google`
3. Server verifies token with Google
4. Server finds or creates user
5. Server returns JWT access + refresh tokens

## Security Features

### Password Security

- Minimum 8 characters (configurable)
- Must include uppercase letter (configurable)
- Must include number (configurable)
- Must include special character (configurable)
- Hashed with bcrypt (12 rounds)

### Encryption

- Sensitive fields in `ExternalCredential` are encrypted with AES-256-GCM
- Encryption keys managed by AWS KMS
- IV + ciphertext + auth tag in encrypted format
- Stored in base64 encoding

### Multi-Factor Authentication (MFA)

- TOTP-based (Time-based One-Time Password)
- QR code generation for setup
- Verification codes required for login when enabled

### Row Level Security

- PostgreSQL native RLS policies
- Automatic tenant isolation
- Set per request via middleware
- Enforced at database level

## Dependencies

### Core Dependencies

```
FastAPI 0.104.1
SQLAlchemy 2.0.23
asyncpg 0.29.0
Pydantic 2.5.0
```

### Security

```
bcrypt 4.1.1
PyJWT 2.8.1
cryptography 41.0.7
python-jose 3.3.0
google-auth 2.25.2
```

### AWS

```
boto3 1.29.7
```

See `requirements.txt` for complete list.

## Environment Variables

See `.env.example` for all required environment variables:

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret key for signing JWT tokens
- `AWS_S3_BUCKET_NAME`: S3 bucket for documents
- `AWS_KMS_KEY_ID`: KMS key for encryption
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth2 credentials
- `SMTP_*`: Email configuration

## Models & Relationships

All models use SQLAlchemy ORM with proper relationships:

```python
# Example: Case with relationships
case.law_firm          # Parent law firm
case.parent_case       # Parent case (for hierarchies)
case.child_cases       # Child cases
case.case_teams        # Team members
case.documents         # Associated documents
case.tasks             # Associated tasks
case.case_hours        # Time entries
case.case_alerts       # Alerts
case.legal_registries  # Compliance registries
```

All relationships use:
- `back_populates` for bidirectional access
- `cascade="all, delete-orphan"` for automatic cleanup
- Proper `foreign_keys` specifications

## Utilities

### Security (`app/utils/security.py`)

- `hash_password()`: Hash password with bcrypt
- `verify_password()`: Verify password against hash
- `create_access_token()`: Create JWT access token
- `create_refresh_token()`: Create JWT refresh token
- `verify_token()`: Verify & decode JWT
- `extract_user_from_token()`: Extract user info from token
- `validate_password_strength()`: Validate password complexity

### Encryption (`app/utils/encryption.py`)

- `encrypt_field()`: Encrypt a field with AES-256-GCM
- `decrypt_field()`: Decrypt a field
- `hash_field()`: Hash a field with PBKDF2
- `verify_hash()`: Verify a hashed field
- `encrypt_dictionary()`: Encrypt multiple fields in dict
- `decrypt_dictionary()`: Decrypt multiple fields in dict

### Audit (`app/utils/audit.py`)

- `log_audit()`: Log any action
- `log_create()`: Log creation
- `log_update()`: Log update
- `log_delete()`: Log deletion
- `log_login()`: Log login
- `log_logout()`: Log logout

## Middleware

### RLS Middleware (`app/middleware/rls.py`)

- Extracts law_firm_id from JWT token
- Stores in request state
- Available to all endpoints via `request.state.law_firm_id`

### Audit Middleware (`app/middleware/audit.py`)

- Logs all HTTP requests to audit_logs table
- Records method, endpoint, status code, user, IP
- Skips health check and documentation endpoints
- Automatically calculates processing time

## Dependencies Injection

### Common Dependencies

```python
from app.dependencies import (
    get_current_user,              # Current active user
    get_current_active_user,       # Current active user (strict)
    require_roles,                 # Role-based access control
    get_law_firm_id,              # Law firm ID from user
    get_current_law_firm_id,      # Law firm ID from token
    optional_user,                # Optional user (no auth required)
)

# Usage:
@app.get("/profile")
async def get_profile(user: User = Depends(get_current_active_user)):
    return user

@app.get("/admin-only")
async def admin_endpoint(user: User = Depends(require_roles("admin_firma", "super_admin"))):
    return user
```

## Database Initialization

Database is automatically initialized on startup:

1. Creates all tables from models
2. Enables RLS extension
3. Creates RLS policies for each table
4. Initializes data

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Create Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run Database Migrations

```bash
# Using Alembic
alembic upgrade head
```

### 4. Start Server

```bash
python -m uvicorn app.main:app --reload
```

Server runs on `http://localhost:8000`

### 5. Access API

- API Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health: `http://localhost:8000/health`

## Production Deployment

### Requirements

- Python 3.11+
- PostgreSQL 14+ with RLS enabled
- AWS S3 bucket
- AWS KMS key
- Redis (optional, for caching)

### Deployment Considerations

1. **Environment Variables**: Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **SSL/TLS**: Enable HTTPS in production
3. **CORS**: Restrict origins to your frontend domain
4. **CSRF Protection**: Implement CSRF tokens for state-changing operations
5. **Rate Limiting**: Add rate limiting middleware
6. **Database Backups**: Enable PostgreSQL automated backups
7. **Monitoring**: Configure Sentry for error tracking
8. **Logging**: Configure structured logging with proper levels
9. **Database Connection Pooling**: Tune pool_size and max_overflow based on load

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Testing

### Unit Tests

```bash
pytest app/tests/
```

### With Coverage

```bash
pytest --cov=app app/tests/
```

### Format Code

```bash
black app/
isort app/
```

### Type Checking

```bash
mypy app/
```

## License

Proprietary - All Rights Reserved
