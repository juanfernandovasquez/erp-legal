# Legal ERP System - Phase 1

Enterprise Resource Planning system designed specifically for legal firms in Peru, with multi-firm support, case management, document handling, time tracking, and audit capabilities.

## Project Overview

This is a comprehensive ERP solution for law firms that includes:
- Multi-firm support with data isolation via Row-Level Security
- Complete case management with hierarchical structure
- Document management and storage
- Time tracking and billing
- Task and alert management
- Comprehensive audit logging
- External reviewer access
- AI/ML capabilities (Phase 2)

## Tech Stack

### Backend
- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL 14+ with Row-Level Security
- **ORM**: SQLAlchemy 2.0+
- **Migration**: Alembic
- **Authentication**: JWT with python-jose
- **Async**: asyncpg
- **Validation**: Pydantic V2
- **Security**: bcrypt, passlib
- **Logging**: structlog
- **Monitoring**: Sentry

### Frontend
- **Framework**: React 18+
- **State Management**: Redux Toolkit
- **HTTP Client**: axios
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Forms**: react-hook-form
- **Tables**: tanstack/react-table
- **Documentation**: Storybook

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 14
- **Cache**: Redis
- **File Storage**: AWS S3 (development: local)
- **Email**: SMTP (Gmail/SendGrid)
- **Notifications**: WhatsApp API

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for frontend development)
- PostgreSQL 14+ (if running locally)

### Setup with Docker

1. Clone and navigate to the project:
```bash
cd erp-legal
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Initialize database (on first run):
```bash
docker-compose exec backend python -m alembic upgrade head
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development Setup

#### Backend

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up database:
```bash
createdb erp_legal
psql erp_legal < ../database/init.sql
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start development server:
```bash
uvicorn app.main:app --reload
```

#### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Start development server:
```bash
npm start
```

## Project Structure

```
erp-legal/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── dependencies.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── case.py
│       │   ├── document.py
│       │   ├── task.py
│       │   └── ...
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── case.py
│       │   └── ...
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── users.py
│       │   ├── cases.py
│       │   ├── documents.py
│       │   └── ...
│       ├── services/
│       │   ├── __init__.py
│       │   ├── user_service.py
│       │   ├── case_service.py
│       │   ├── document_service.py
│       │   └── ...
│       ├── middleware/
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   └── logging.py
│       └── utils/
│           ├── __init__.py
│           ├── security.py
│           ├── validators.py
│           └── helpers.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── public/
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── styles/
│   │   └── utils/
│   └── .env.example
└── database/
    ├── init.sql
    ├── schema.sql
    ├── rls_policies.sql
    ├── indexes.sql
    └── seeds.sql
```

## Database Schema

The system uses 27 tables organized in 8 domains:

1. **Client & User Management** (5 tables): law_firms, users, case_team, case_team_history, external_reviewers
2. **Cases & Structure** (3 tables): cases, case_hierarchy, case_clients
3. **Documents** (2 tables): documents, document_metadata
4. **Timeline & Tracking** (3 tables): case_events, case_updates, case_timeline_view
5. **Tasks, Hours & Organization** (4 tables): tasks, case_hours, invoice_metrics, task_schedule
6. **Processes, Alerts & Registries** (4 tables): process_types, case_alerts, legal_registries, external_credentials
7. **IA & Analysis** (4 tables - Phase 2): ia_analysis_results, ia_audit_log, ia_feedback, anonimizacion_rules
8. **Audit & Security** (2 tables): audit_logs, clients

### Key Features

- **Row-Level Security**: Data is automatically filtered by law_firm_id at the database level
- **Soft Deletes**: All tables maintain created_by, updated_by, deleted_by, and deleted_at for audit trails
- **Immutable Events**: case_events table is append-only for compliance
- **Time Tracking**: Granular hour tracking with approval workflows
- **External Access**: Controlled read-only access for external reviewers
- **Audit Logging**: Every action is logged with user, IP, and changes

## API Endpoints (Phase 1)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### Users & Firms
- `GET/POST /firms` - Get/create law firm
- `GET/POST /users` - List/create users
- `GET/PUT /users/{id}` - Get/update user
- `DELETE /users/{id}` - Soft delete user

### Cases
- `GET/POST /cases` - List/create cases
- `GET/PUT /cases/{id}` - Get/update case
- `POST /cases/{id}/clients` - Add clients to case
- `GET /cases/{id}/team` - Get case team
- `POST /cases/{id}/team` - Assign user to case

### Documents
- `POST /documents/upload` - Upload document
- `GET /documents/{id}` - Download document
- `GET /documents` - List case documents
- `DELETE /documents/{id}` - Archive document

### Tasks
- `GET/POST /tasks` - List/create tasks
- `PUT /tasks/{id}` - Update task
- `POST /tasks/{id}/complete` - Mark task complete

### Hours & Billing
- `POST /case-hours` - Log work hours
- `GET /case-hours` - List work hours
- `GET /invoices` - List billing metrics
- `POST /invoices/{id}/approve` - Approve hours for billing

### Alerts
- `GET /alerts` - List case alerts
- `POST /alerts` - Create alert
- `PUT /alerts/{id}` - Update alert status

## Environment Variables

See `.env.example` for all available configuration options. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret (change in production!)
- `ENVIRONMENT` - development | staging | production
- `AWS_S3_BUCKET_NAME` - S3 bucket for document storage
- `SENTRY_DSN` - Sentry error tracking
- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

## Development

### Running Tests

Backend:
```bash
cd backend
pytest
```

Frontend:
```bash
cd frontend
npm test
```

### Code Formatting

Backend:
```bash
cd backend
black . --line-length=100
isort .
```

Frontend:
```bash
cd frontend
npx prettier --write .
npx eslint . --fix
```

### Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Run migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

## Security Considerations

- All passwords are hashed with bcrypt (rounds=12)
- JWT tokens have expiration times
- Row-Level Security enforces data isolation by law_firm_id
- SQL injection is prevented via parameterized queries
- CORS is restricted to allowed origins
- Sensitive data fields use encryption where applicable
- External credentials are encrypted at rest
- All actions are audited in audit_logs table
- Rate limiting should be implemented in production

## Deployment

### Production Checklist

- [ ] Generate new `SECRET_KEY`
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Configure SSL/TLS certificates
- [ ] Set up proper database backups
- [ ] Configure Sentry for error tracking
- [ ] Set up email service (SendGrid/AWS SES)
- [ ] Configure AWS S3 for document storage
- [ ] Set up Redis for caching
- [ ] Configure WhatsApp API credentials
- [ ] Set up CDN for static files
- [ ] Configure monitoring and alerts
- [ ] Run security audit
- [ ] Set up log aggregation (ELK/DataDog)

### Docker Deployment

Build images:
```bash
docker build -t erp-legal-backend:latest ./backend
docker build -t erp-legal-frontend:latest ./frontend
```

Push to registry:
```bash
docker tag erp-legal-backend:latest your-registry/erp-legal-backend:latest
docker push your-registry/erp-legal-backend:latest
```

## Monitoring & Logging

The system uses:
- **structlog** for structured logging
- **Sentry** for error tracking
- **PostgreSQL audit_logs table** for action tracking
- Custom middleware for request/response logging

View logs:
```bash
# Docker
docker-compose logs -f backend

# Local
tail -f logs/erp_legal.log
```

## Support & Documentation

- API Documentation: http://localhost:8000/docs (Swagger UI)
- API Schema: http://localhost:8000/openapi.json
- Database Documentation: See `database/README.md`
- Development Guide: See `DEVELOPMENT.md`

## License

Proprietary - All rights reserved

## Phase 2 Roadmap

- AI-powered legal analysis and document generation
- Advanced analytics and reporting
- Mobile app (iOS/Android)
- Integration with external legal databases
- Machine learning for case outcome prediction
- Automated document redaction
- Advanced billing and invoicing

## Contact

For questions or issues, contact the development team.
