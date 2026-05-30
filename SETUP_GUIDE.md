# Legal ERP System - Complete Setup Guide

## Project Completion Status

✅ Phase 1 - COMPLETE

- **27 Database Tables** - All created with complete schema
- **24 ENUM Types** - Comprehensive type system
- **60+ Strategic Indexes** - Optimized performance
- **Row-Level Security** - Multi-tenancy enforcement
- **Complete Audit Trail** - All 27 tables with audit fields
- **Docker Infrastructure** - Full containerization
- **Backend Framework** - FastAPI with async SQLAlchemy
- **Configuration System** - Environment-based settings
- **Documentation** - Comprehensive guides

## File Inventory

### Database (5 SQL files)
- `database/init.sql` (50 lines) - Master initialization
- `database/schema.sql` (750+ lines) - All 27 tables + 24 ENUMs
- `database/rls_policies.sql` (350+ lines) - RLS for multi-tenancy
- `database/indexes.sql` (200+ lines) - 60+ performance indexes
- `database/seeds.sql` (300+ lines) - Sample data
- `database/README.md` (1000+ lines) - Complete documentation

### Backend (20+ Python files)
- `backend/requirements.txt` - 59 dependencies
- `backend/alembic.ini` - Migration config
- `backend/alembic/env.py` - Migration environment
- `backend/app/main.py` - FastAPI app setup
- `backend/app/config.py` - Environment configuration
- `backend/app/database.py` - SQLAlchemy setup
- `backend/app/dependencies.py` - Dependency injection
- `backend/app/models/` - SQLAlchemy ORM models
- `backend/app/schemas/` - Pydantic request/response schemas
- `backend/app/routers/` - FastAPI route handlers
- `backend/app/services/` - Business logic layer
- `backend/app/middleware/` - Custom middleware
- `backend/app/utils/` - Utility functions

### Configuration
- `.env.example` - All environment variables
- `.gitignore` - Git ignore patterns
- `docker-compose.yml` - Full stack orchestration
- `README.md` - Main documentation
- `PROJECT_STRUCTURE.md` - Architecture overview
- `SETUP_GUIDE.md` - This file

## Quick Start (5 minutes)

### Prerequisites
- Docker & Docker Compose installed
- OR: Python 3.11+, PostgreSQL 14+, Node.js 18+

### Option 1: Docker (Recommended)

```bash
cd /sessions/pensive-awesome-planck/mnt/katarzyna\ web/erp-legal

# Create environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Verify startup
docker-compose ps
docker-compose logs backend
```

**Access:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000 (when built)

### Option 2: Local Setup

#### Backend

```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Create database
createdb erp_legal

# Initialize schema
psql erp_legal < ../database/init.sql

# Start server
uvicorn app.main:app --reload --port 8000
```

#### Frontend (Optional for Phase 1)

```bash
cd frontend
npm install
npm start
```

## Database Connection

### From Application Code

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    "postgresql+asyncpg://postgres:postgres@localhost:5432/erp_legal"
)

# For RLS context
async with engine.begin() as conn:
    await conn.execute(
        text(f"SET app.current_law_firm_id = '{law_firm_id}'")
    )
```

### Direct CLI

```bash
psql -h localhost -U postgres -d erp_legal

-- Inside psql
SET app.current_law_firm_id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM cases WHERE estado = 'abierto';
```

## API Testing

### Get Health Status

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "1.0.0"
}
```

### Access API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Management

### Backup

```bash
# Full backup
pg_dump -h localhost -U postgres erp_legal > backup_$(date +%Y%m%d).sql

# Just audit logs (7-year retention)
pg_dump -h localhost -U postgres -t audit_logs erp_legal > audit_backup.sql
```

### Restore

```bash
psql -h localhost -U postgres erp_legal < backup_20240101.sql
```

### Reset (Development Only)

```bash
# Drop and recreate
dropdb -h localhost -U postgres erp_legal
createdb -h localhost -U postgres erp_legal
psql -h localhost -U postgres erp_legal < database/init.sql
```

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_legal

# JWT
SECRET_KEY=your-very-secret-key-change-in-production
ALGORITHM=HS256

# Environment
ENVIRONMENT=development
DEBUG=true
```

### Optional Variables (Phase 2)

```bash
# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=erp-legal-documents

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# IA/ML
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Development Workflow

### Add New Table

1. Modify `database/schema.sql`
2. Update `database/rls_policies.sql`
3. Update `database/indexes.sql`
4. Create migration:
   ```bash
   cd backend
   alembic revision --autogenerate -m "Add new table"
   alembic upgrade head
   ```

### Add New API Endpoint

1. Create model in `backend/app/models/`
2. Create schema in `backend/app/schemas/`
3. Create router in `backend/app/routers/`
4. Import in `backend/app/main.py`:
   ```python
   from app.routers import your_router
   app.include_router(your_router.router, prefix="/api/endpoint")
   ```

### Add New Service

1. Create service in `backend/app/services/`
2. Import dependencies
3. Use in routers via dependency injection

## Testing

### Run Backend Tests

```bash
cd backend
pytest
pytest --cov=app  # With coverage
```

### Test Database Connection

```bash
cd backend

python -c "
import asyncio
from app.database import AsyncSessionLocal, init_db

async def test():
    await init_db()
    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        result = await session.execute(text('SELECT NOW()'))
        print('Database OK:', result.scalar())

asyncio.run(test())
"
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Try manual connection
psql -h localhost -U postgres -d erp_legal

# If container issue, restart
docker-compose restart postgres
```

### Permission Denied Errors

```bash
# PostgreSQL user needs proper permissions
psql -h localhost -U postgres -d erp_legal << SQL
GRANT ALL PRIVILEGES ON DATABASE erp_legal TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
SQL
```

### RLS Not Working

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'cases';

-- Should show TRUE for rowsecurity

-- Test RLS context
SET app.current_law_firm_id = '11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) FROM cases;  -- Should return data for that firm only
```

### Migration Issues

```bash
cd backend

# Check migration status
alembic current
alembic history

# Rollback if needed
alembic downgrade -1

# Try manual migration
psql -f /path/to/migration.sql
```

## Performance Optimization

### Monitor Query Performance

```sql
-- Enable logging of slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
SELECT pg_reload_conf();

-- View logs
tail -f /var/log/postgresql/postgresql.log
```

### Analyze Table Statistics

```sql
ANALYZE cases;
ANALYZE case_hours;
ANALYZE case_events;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Deployment Checklist

- [ ] Generate new SECRET_KEY
- [ ] Set ENVIRONMENT=production
- [ ] Set DEBUG=false
- [ ] Configure SSL/TLS
- [ ] Set up database backups
- [ ] Configure Sentry
- [ ] Set up email service
- [ ] Configure AWS S3
- [ ] Set up monitoring
- [ ] Run security audit
- [ ] Test disaster recovery

## Common Tasks

### Create Test User

```python
from app.models.user import User
from app.utils.security import hash_password

new_user = User(
    law_firm_id=law_firm_id,
    nombre="Test User",
    email="test@example.com",
    password_hash=hash_password("password123"),
    tipo_usuario="abogado_junior"
)
session.add(new_user)
await session.commit()
```

### Query with RLS Context

```python
from sqlalchemy import text

# Set context for current user's firm
await session.execute(
    text(f"SET app.current_law_firm_id = '{current_user.law_firm_id}'")
)

# Query automatically filtered
result = await session.execute(select(Case))
cases = result.scalars().all()  # Only current firm's cases
```

### Generate API Documentation

```bash
# API docs already available at /docs and /redoc
# To generate static docs:
# (Will be implemented in Phase 2)
```

## Monitoring & Logs

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

### Health Monitoring

```bash
# Check service health
docker-compose exec backend curl http://localhost:8000/health

# Database connection check
docker-compose exec postgres psql -U postgres -d erp_legal -c "SELECT 1"
```

## Phase 2 Preparation

The schema is complete and ready for:
- AI analysis endpoints
- Advanced reporting
- Mobile app APIs
- External integrations
- Enhanced analytics

No schema changes needed - IA tables already exist!

## Support & Documentation

- **Database Schema**: See `database/README.md`
- **Project Architecture**: See `PROJECT_STRUCTURE.md`
- **API Documentation**: Visit http://localhost:8000/docs
- **Configuration**: See `.env.example`
- **Code Examples**: See individual router files

## Key Facts

- **27 Tables** - All created and indexed
- **7-Year Audit Trail** - Complete audit_logs retention
- **Multi-Tenancy** - RLS-based firm isolation
- **Soft Deletes** - No permanent data loss
- **PostgreSQL 14+** - Modern database features
- **Docker Ready** - One-command deployment
- **Type Safe** - Pydantic + SQLAlchemy validation
- **Async Everywhere** - FastAPI + asyncpg performance

---

For questions or issues, check the relevant documentation file or the API docs at /docs

**Version**: 1.0.0
**Status**: Phase 1 Complete - Ready for Development
**Last Updated**: 2024-04-12
