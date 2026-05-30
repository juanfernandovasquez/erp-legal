# Legal ERP Phase 1 - Complete Project Structure

## Project Overview

A comprehensive Enterprise Resource Planning system for legal firms in Peru. Phase 1 includes:
- Multi-firm support with complete data isolation (RLS)
- 27 database tables across 8 logical domains
- Complete case management with hierarchical structure
- Document management
- Time tracking and billing
- Task and alert management
- Comprehensive audit logging
- External reviewer access
- Foundation for Phase 2 AI capabilities

**Database**: PostgreSQL 14+ with 27 tables
**Backend**: FastAPI with SQLAlchemy async ORM
**Frontend**: React 18+ (structure created, to be developed)
**Infrastructure**: Docker & Docker Compose

## Directory Structure

```
/sessions/pensive-awesome-planck/mnt/katarzyna web/erp-legal/
├── README.md                          # Main project documentation
├── PROJECT_STRUCTURE.md               # This file
├── docker-compose.yml                 # Full stack with PostgreSQL, FastAPI, React, Redis
├── .env.example                       # Environment variables template
├── .gitignore                         # Git ignore rules
│
├── database/                          # Database schema and initialization
│   ├── README.md                      # Complete database documentation
│   ├── init.sql                       # Master initialization (calls all others)
│   ├── schema.sql                     # All 27 table definitions with 24 ENUM types
│   ├── rls_policies.sql               # Row-Level Security policies for multi-tenancy
│   ├── indexes.sql                    # Strategic performance indexes
│   └── seeds.sql                      # Sample data (1 firm, 3 users, 2 cases)
│
├── backend/                           # Python FastAPI backend
│   ├── Dockerfile                     # Backend container definition
│   ├── requirements.txt               # Python dependencies (27 packages)
│   ├── alembic.ini                    # Database migration configuration
│   │
│   ├── alembic/                       # Database migrations (Alembic)
│   │   ├── env.py                     # Migration environment
│   │   └── versions/                  # Migration files (auto-generated)
│   │
│   └── app/                           # Main FastAPI application
│       ├── __init__.py                # Package init
│       ├── main.py                    # FastAPI app, routes, middleware, health check
│       ├── config.py                  # Settings from environment variables
│       ├── database.py                # SQLAlchemy engine, session, RLS context
│       ├── dependencies.py            # Dependency injection (get_db, etc.)
│       │
│       ├── models/                    # SQLAlchemy ORM models
│       │   ├── __init__.py            # Package init with model imports
│       │   └── (to be created)        # Models for all 27 tables
│       │
│       ├── schemas/                   # Pydantic schemas (request/response)
│       │   ├── __init__.py            # Package init with schema imports
│       │   └── (to be created)        # Input/output schemas
│       │
│       ├── routers/                   # API route handlers (FastAPI)
│       │   ├── __init__.py            # Package init with router imports
│       │   └── (to be created)        # Routes for each domain
│       │
│       ├── services/                  # Business logic layer
│       │   ├── __init__.py            # Package init
│       │   └── (to be created)        # Service classes
│       │
│       ├── middleware/                # Custom middleware
│       │   ├── __init__.py            # Package init
│       │   └── (to be created)        # Auth, logging, etc.
│       │
│       └── utils/                     # Utility functions
│           ├── __init__.py            # Package init
│           └── (to be created)        # Security, validation, helpers
│
└── frontend/                          # React application (scaffold)
    ├── Dockerfile                     # Frontend container
    └── .env.example                   # Frontend environment variables
```

## Database Schema (27 Tables)

### Domain 1: Client & User Management (5 tables)
- **law_firms** - Multi-tenant parent (1 firm = isolated data)
- **users** - Lawyers and staff (6 role types)
- **case_team** - User-to-case assignments (N:N)
- **case_team_history** - Immutable audit trail of team changes
- **external_reviewers** - Read-only external access control

### Domain 2: Cases & Structure (3 tables)
- **cases** - Legal cases with parent-child hierarchy (max 2 levels)
- **case_hierarchy** - Explicit parent-child relationships
- **case_clients** - Client-to-case assignments (N:N)

### Domain 3: Documents (2 tables)
- **documents** - File metadata with S3 storage support
- **document_metadata** - Extended metadata (OCR, pages, language, etc.)

### Domain 4: Timeline & Tracking (3 tables + 1 view)
- **case_events** - Immutable milestones (append-only)
- **case_updates** - Editable comments with versioning
- **case_timeline_view** - SQL view combining both chronologically

### Domain 5: Tasks, Hours & Organization (4 tables)
- **tasks** - Action items per case
- **case_hours** - Granular time tracking (for billing)
- **invoice_metrics** - Billing calculations
- **task_schedule** - Weekly recurring task organization

### Domain 6: Processes, Alerts & Registries (4 tables)
- **process_types** - Legal process catalogs per firm
- **case_alerts** - Deadlines with daily CRON checking
- **legal_registries** - Property/trademark registries
- **external_credentials** - Encrypted platform credentials

### Domain 7: IA & Analysis (4 tables - Phase 2)
- **ia_analysis_results** - AI analysis results (gpt-4, claude, etc.)
- **ia_audit_log** - Complete AI activity log
- **ia_feedback** - Lawyer validation feedback
- **anonimizacion_rules** - Document anonymization rules

### Domain 8: Audit & Security (2 tables)
- **audit_logs** - Complete action log (7-year legal retention)
- **clients** - External clients (with portal access option)

## Standard Table Structure

Every table includes:
```sql
-- Primary Key & IDs
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Timestamps
created_at TIMESTAMP NOT NULL DEFAULT NOW()
updated_at TIMESTAMP NOT NULL DEFAULT NOW()

-- Audit Trail
created_by UUID REFERENCES users(id)
updated_by UUID REFERENCES users(id)

-- Soft Deletes
is_deleted BOOLEAN NOT NULL DEFAULT false
deleted_at TIMESTAMP
deleted_by UUID REFERENCES users(id)
```

**Exception**: `audit_logs` table has no soft delete (completely immutable)

## Key Features

### 1. Multi-Tenancy via Row-Level Security
- **law_firm_id** on all tenant-aware tables
- RLS policies ensure automatic filtering
- Set `app.current_law_firm_id` context on DB connection
- Zero SQL injection risk from tenant mixing

### 2. Soft Deletes
- All tables maintain full audit history
- No data loss; logical deletion only
- Query filter: `WHERE is_deleted = false`
- Enables compliance and audit trails

### 3. Comprehensive Audit Logging
- `audit_logs` table tracks every action:
  - User who made change
  - Timestamp and IP address
  - Before/after data (JSONB)
  - Success/failure status
- 7-year retention (Peru legal requirement)

### 4. Case Hierarchy
- Parent case → Sub-cases (max 2 levels)
- Example: Main case → Appeal case
- Unique case number per firm
- Automatic validation prevents deeper nesting

### 5. Time Tracking & Billing
- Granular `case_hours` tracking
- `es_facturable` flag for billing inclusion
- `invoice_metrics` for period calculations
- Approval workflow via `aprobado_por`

### 6. Alert & Deadline Management
- `case_alerts` with daily CRON checking
- Multiple notification channels (email, WhatsApp)
- Configurable reminder days (e.g., [30, 7, 3, 1])
- Escalation tracking

### 7. Document Management
- Always linked to parent case
- SHA256 hashing for deduplication
- S3 storage with local path tracking
- Confidentiality and client visibility flags
- Extended metadata (OCR, language, page count)

### 8. Immutable Events
- `case_events` is append-only
- No updates allowed (legal compliance)
- Perfect for timeline reconstruction

## Indexes (Strategic Performance)

The schema includes 60+ indexes:
- **Tenant isolation**: law_firm_id lookups
- **Case queries**: status, priority, dates
- **Hour tracking**: user + period for invoicing
- **Alert management**: responsible + status
- **Full-text search**: Spanish language support
- **Composite indexes**: Common query patterns

Example: Invoice generation uses index on `(user_id, fecha_trabajo)`

## ENUM Types (24 Total)

All ENUMs are PostgreSQL CREATE TYPE:
- plan_enum (4 values)
- user_type_enum (6 values)
- case_status_enum (6 values)
- event_type_enum (9 values)
- alert_type_enum (6 values)
- document_type_enum (8 values)
- And 17 more...

**All values are LOWERCASE** per database convention

## Environment Configuration

See `.env.example` for all variables:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/erp_legal

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AWS S3
AWS_S3_BUCKET_NAME=erp-legal-documents
AWS_S3_REGION=us-east-1

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com

# WhatsApp
WHATSAPP_API_TOKEN=your-token

# Logging
SENTRY_DSN=https://...
LOG_LEVEL=INFO

# IA/ML (Phase 2)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Backend Stack

### Core Dependencies
- **fastapi** 0.104.1 - Web framework
- **uvicorn** 0.24.0 - ASGI server
- **sqlalchemy** 2.0.23 - Async ORM
- **asyncpg** 0.29.0 - PostgreSQL driver
- **alembic** 1.12.1 - Database migrations
- **pydantic** 2.5.0 - Data validation
- **python-jose** 3.3.0 - JWT tokens
- **passlib** 1.7.4 with bcrypt - Password hashing

### Additional Libraries
- boto3 - AWS S3 integration
- httpx - Async HTTP client
- structlog - Structured logging
- sentry-sdk - Error tracking
- python-dotenv - Environment variables

## API Endpoints (Phase 1 - To Be Implemented)

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Get JWT token
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Users & Firms
- `GET/POST /firms` - Get/create law firm
- `GET/POST /users` - List/create users
- `GET/PUT /users/{id}` - Get/update user
- `DELETE /users/{id}` - Soft delete user

### Cases
- `GET/POST /cases` - List/create cases
- `GET/PUT /cases/{id}` - Get/update case
- `POST /cases/{id}/clients` - Add clients
- `GET /cases/{id}/team` - Get case team
- `POST /cases/{id}/team` - Assign user

### Documents
- `POST /documents/upload` - Upload file
- `GET /documents/{id}` - Download file
- `GET /documents` - List by case
- `DELETE /documents/{id}` - Archive

### Tasks
- `GET/POST /tasks` - List/create
- `PUT /tasks/{id}` - Update
- `POST /tasks/{id}/complete` - Mark complete

### Hours & Billing
- `POST /case-hours` - Log hours
- `GET /case-hours` - List hours
- `GET /invoices` - Get billing metrics
- `POST /invoices/{id}/approve` - Approve hours

### Alerts
- `GET /alerts` - List alerts
- `POST /alerts` - Create alert
- `PUT /alerts/{id}` - Update alert

## Docker Deployment

```bash
# Start entire stack
docker-compose up -d

# Access points
Frontend: http://localhost:3000
API: http://localhost:8000
API Docs: http://localhost:8000/docs
Database: localhost:5432
Redis: localhost:6379
```

## Quick Start

1. **Clone repository** and navigate to erp-legal/

2. **Create .env file**:
   ```bash
   cp .env.example .env
   ```

3. **Start with Docker**:
   ```bash
   docker-compose up -d
   ```

4. **Initialize database** (first run):
   ```bash
   docker-compose exec backend python -m alembic upgrade head
   ```

5. **Seed data** (optional):
   ```bash
   # Already included in docker-compose via init.sql
   ```

## Development Setup (Local)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
createdb erp_legal
psql erp_legal < ../database/init.sql
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Database Initialization

Run in order:
```bash
# Full initialization
psql erp_legal < database/init.sql

# Or step by step
psql erp_legal < database/schema.sql
psql erp_legal < database/rls_policies.sql
psql erp_legal < database/indexes.sql
psql erp_legal < database/seeds.sql
```

## Sample Data

Seed data includes:
- **1 Law Firm**: "López & Asociados Abogados"
- **3 Users**: Admin, Senior Lawyer, Junior Lawyer
- **2 Clients**: Corporate and individual
- **2 Cases**: Main case and appeal (sub-case)
- **Sample Events, Updates, Tasks, Hours, Alerts**

## Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: HS256 with expiration
- **RLS**: Row-level database policies
- **Soft Deletes**: Full audit trail
- **Encrypted Credentials**: External platform passwords
- **Audit Logging**: Every action tracked
- **Rate Limiting**: To be implemented
- **CORS**: Configured per environment

## Phase 2 Roadmap

- AI-powered document analysis (GPT-4, Claude)
- Predictive case outcome modeling
- Automated document generation
- Advanced analytics and dashboards
- Mobile app (iOS/Android)
- External legal database integration
- Machine learning case predictions
- Automated contract review

## Legal Compliance

- **Peru Requirements**:
  - 7-year audit log retention
  - RUC validation for firms
  - Multi-language support (Spanish/English)
  - Peruvian time zone (America/Lima)
  - Currency support (PEN, USD)

- **Data Protection**:
  - Soft deletes (no permanent deletion)
  - Complete audit trail
  - RLS enforcement
  - Encrypted credentials
  - Anonymization rules for IA

## File Locations

- **Database Schema**: `/database/schema.sql` (2000+ lines)
- **Database Documentation**: `/database/README.md` (800+ lines)
- **Backend Config**: `/backend/app/config.py`
- **Main API**: `/backend/app/main.py`
- **Docker Setup**: `/docker-compose.yml`
- **Project README**: `/README.md`

## Next Steps

1. **Implement Backend Models**: Create SQLAlchemy models for all 27 tables
2. **Implement API Routes**: Create FastAPI routes for all endpoints
3. **Implement Frontend**: Build React UI with authentication, case management
4. **Integration Testing**: Test full stack workflows
5. **Deploy to Production**: Set up cloud infrastructure
6. **Phase 2**: Add AI capabilities

## Support

For questions about:
- **Database Schema**: See `/database/README.md`
- **Architecture**: See main `/README.md`
- **Configuration**: See `.env.example`
- **API Development**: See backend app structure

---

**Version**: 1.0.0
**Created**: 2024-04-12
**Status**: Phase 1 - Complete Schema & Infrastructure
