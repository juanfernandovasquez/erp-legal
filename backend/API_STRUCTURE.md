# Legal ERP API - Complete Structure

This document provides an overview of all API endpoints and files created for the Legal ERP system.

## File Structure

### Routers (15 files)
All routers are located in `app/routers/` and implement the API endpoints.

```
routers/
├── __init__.py                    # Router package initialization
├── auth.py                        # Authentication endpoints (login, register, token refresh)
├── law_firms.py                   # Law firm management (get current firm, update settings)
├── users.py                       # User management (CRUD, role assignment)
├── cases.py                       # Core case management (CRUD, team assignment, hierarchy)
├── documents.py                   # Document management (S3 uploads/downloads)
├── timeline.py                    # Case timeline (events + updates chronologically)
├── tasks.py                       # Task management (creation, assignment, status)
├── hours.py                       # Time tracking (hours registration, summaries)
├── alerts.py                      # Alerts and deadlines (creation, status tracking)
├── clients.py                     # Client management (CRUD, case association)
├── process_types.py               # Legal process type catalog (civil, criminal, etc.)
├── dashboard.py                   # Admin dashboard (metrics, audit logs)
└── client_portal.py               # External client portal (read-only access)
```

### Services (4 files)
Business logic and external integrations in `app/services/`.

```
services/
├── __init__.py                    # Services package initialization
├── case_service.py                # Case hierarchy validation, team access checks, case numbering
├── document_service.py            # S3 integration, presigned URLs, file validation
├── alert_service.py               # Alert processing, escalation logic, reminders
└── audit_service.py               # Centralized audit logging for all operations
```

### Utilities (2 files)
Response formatting and authentication helpers in `app/utils/`.

```
utils/
├── auth.py                        # JWT token handling, dependencies, role checking
└── responses.py                   # Standard response formatting (success, error, paginated)
```

### Schemas (12 files)
Pydantic models in `app/schemas/` for request/response validation.

```
schemas/
├── auth.py                        # LoginRequest, RefreshTokenRequest, RegisterRequest
├── law_firms.py                   # LawFirmUpdateRequest
├── users.py                       # UserCreateRequest, UserUpdateRequest, UserListQuery
├── cases.py                       # CaseCreateRequest, CaseUpdateRequest, SubCaseCreateRequest
├── documents.py                   # DocumentUploadResponse
├── timeline.py                    # EventCreateRequest, UpdateCreateRequest, UpdateEditRequest
├── tasks.py                       # TaskCreateRequest, TaskUpdateRequest
├── hours.py                       # HourEntryCreateRequest, HourEntryUpdateRequest
├── alerts.py                      # AlertCreateRequest, AlertUpdateRequest
├── clients.py                     # ClientCreateRequest, ClientUpdateRequest
├── process_types.py               # ProcessTypeCreateRequest, ProcessTypeUpdateRequest
└── client_portal.py               # ClientLoginRequest, client-visible response schemas
```

## API Endpoints Summary

### Authentication (5 endpoints)
- `POST /api/v1/auth/login` - Email/password login
- `POST /api/v1/auth/logout` - Revoke token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/register` - Register new law firm + admin user
- `GET /api/v1/auth/me` - Get current user profile

### Law Firms (2 endpoints)
- `GET /api/v1/law-firms/current` - Get current law firm details
- `PATCH /api/v1/law-firms/current` - Update law firm settings

### Users (5 endpoints)
- `GET /api/v1/users` - List users with pagination
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/{id}` - Get user details
- `PATCH /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Soft delete user

### Cases (9 endpoints)
- `GET /api/v1/cases` - List cases (filtered by team for junior/admin)
- `POST /api/v1/cases` - Create case
- `GET /api/v1/cases/{id}` - Get case details
- `PATCH /api/v1/cases/{id}` - Update case
- `GET /api/v1/cases/{id}/sub-cases` - List sub-cases
- `POST /api/v1/cases/{id}/sub-cases` - Create sub-case
- `GET /api/v1/cases/{id}/team` - List case team members
- `POST /api/v1/cases/{id}/team` - Add team member
- `DELETE /api/v1/cases/{id}/team/{user_id}` - Remove team member

### Documents (5 endpoints)
- `GET /api/v1/cases/{id}/documents` - List case documents
- `POST /api/v1/cases/{id}/documents/upload` - Get presigned S3 upload URL
- `GET /api/v1/documents/{id}` - Get document details
- `GET /api/v1/documents/{id}/download` - Get presigned S3 download URL
- `DELETE /api/v1/documents/{id}` - Soft delete document

### Timeline (5 endpoints)
- `GET /api/v1/cases/{id}/timeline` - Combined timeline (events + updates)
- `GET /api/v1/cases/{id}/events` - List events only
- `POST /api/v1/cases/{id}/events` - Create immutable event
- `GET /api/v1/cases/{id}/updates` - List updates/comments
- `POST /api/v1/cases/{id}/updates` - Create update
- `PATCH /api/v1/updates/{id}` - Edit update (creates version)

### Tasks (4 endpoints)
- `GET /api/v1/cases/{id}/tasks` - List case tasks
- `POST /api/v1/cases/{id}/tasks` - Create task
- `PATCH /api/v1/tasks/{id}` - Update task
- `GET /api/v1/tasks/my-tasks` - Get user's assigned tasks

### Hours (5 endpoints)
- `GET /api/v1/cases/{id}/hours` - List hours for case
- `POST /api/v1/cases/{id}/hours` - Register hours
- `PATCH /api/v1/hours/{id}` - Update hours entry
- `GET /api/v1/hours/my-hours` - Get user's hours (with date range)
- `GET /api/v1/cases/{id}/hours/summary` - Aggregated summary (by user/task/day)

### Alerts (5 endpoints)
- `GET /api/v1/alerts` - List user's pending/overdue alerts
- `GET /api/v1/cases/{id}/alerts` - List case alerts
- `POST /api/v1/cases/{id}/alerts` - Create alert
- `PATCH /api/v1/alerts/{id}` - Update alert status
- `GET /api/v1/alerts/summary` - Alert summary counts

### Clients (5 endpoints)
- `GET /api/v1/clients` - List law firm clients
- `POST /api/v1/clients` - Create client
- `GET /api/v1/clients/{id}` - Get client details
- `PATCH /api/v1/clients/{id}` - Update client
- `GET /api/v1/clients/{id}/cases` - Get client's cases

### Process Types (4 endpoints)
- `GET /api/v1/process-types` - List process types
- `POST /api/v1/process-types` - Create process type
- `PATCH /api/v1/process-types/{id}` - Update process type
- `DELETE /api/v1/process-types/{id}` - Soft delete process type

### Dashboard (2 endpoints)
- `GET /api/v1/admin/dashboard` - Dashboard metrics
- `GET /api/v1/admin/audit-logs` - Query audit logs

### Client Portal (4 endpoints)
- `POST /api/v1/client/auth` - Client login
- `GET /api/v1/client/cases` - Get client's visible cases
- `GET /api/v1/client/cases/{id}` - Case detail (public view)
- `GET /api/v1/client/cases/{id}/timeline` - Public timeline events only

## Key Features

### Response Format
All endpoints return standardized JSON responses:

**Success Response:**
```json
{
  "data": {...},
  "meta": {
    "timestamp": "2026-04-12T10:30:00",
    "version": "1.0"
  }
}
```

**Paginated Response:**
```json
{
  "data": [...],
  "meta": {
    "timestamp": "2026-04-12T10:30:00",
    "version": "1.0",
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-04-12T10:30:00"
  }
}
```

### Pagination
All list endpoints support:
- `page=1` (default 1, minimum 1)
- `limit=20` (default 20, maximum 100)
- `sort=-created_at` (prefix with `-` for descending)

### Authentication
- JWT-based authentication
- Bearer token in Authorization header
- Access token expiration configurable
- Refresh token support for long-lived sessions

### Authorization
Role-based access control:
- `super_admin` - Full access
- `admin_firma` - Firm-level administration
- `abogado_senior` - Senior lawyer, can create cases
- `abogado_junior` - Junior lawyer, limited to assigned cases
- `administrativo` - Administrative staff, read-only access
- `revisor_externo` - External reviewers (client portal)

### Multi-Tenancy
All data is automatically filtered by `law_firm_id` from JWT token.

### Audit Trail
All significant operations logged to `audit_logs` table including:
- Action type (CREATE, UPDATE, DELETE)
- Entity type and ID
- User performing action
- Old and new values for updates

### Soft Deletes
No records are permanently deleted; all have `is_deleted` flag.

## Service Layer

### case_service.py
- `validate_case_hierarchy()` - Enforce max 2 levels
- `check_parent_can_close()` - Validate parent has no open sub-cases
- `generate_case_number()` - Auto-generate unique case numbers
- `check_case_team_access()` - Verify user team membership

### document_service.py
- `generate_presigned_upload_url()` - S3 upload endpoint
- `generate_presigned_download_url()` - S3 download endpoint
- `validate_document_file()` - File type and size validation
- `calculate_file_hash()` - SHA-256 hash calculation

### alert_service.py
- `process_pending_alerts()` - Background job for alert escalation
- `send_alert_reminder()` - Notification integration point
- `check_upcoming_deadlines()` - Get upcoming alerts

### audit_service.py
- `audit_log()` - Create audit log entries
- `get_audit_trail()` - Query audit history

## Configuration
Key environment variables (from settings):
- `JWT_SECRET_KEY` - JWT signing key
- `JWT_EXPIRATION_HOURS` - Access token lifetime
- `JWT_REFRESH_EXPIRATION_DAYS` - Refresh token lifetime
- `S3_BUCKET` - AWS S3 bucket name
- `DATABASE_URL` - PostgreSQL connection string

## Rate Limiting
100 requests/minute per user (configured via middleware).

## Deployment Notes
1. All endpoints are async/await throughout
2. Database transactions used for data consistency
3. Soft deletes simplify data recovery
4. Audit logging enables compliance
5. S3 integration for secure document storage
6. JWT validation on every request
7. Multi-tenant filtering automatic on all queries
