"""
Muestra qué tareas con due_date están cubiertas por reglas de notificación.
"""
import asyncio, os
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload


async def check():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL no definida")
        return

    engine = create_async_engine(db_url, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from app.models import Task, NotificationRule

    today = datetime.now(timezone.utc).date()

    async with factory() as db:
        rules_q = await db.execute(
            select(NotificationRule).where(
                NotificationRule.is_active == True,
                NotificationRule.is_deleted == False,
            )
        )
        rules = rules_q.scalars().all()
        covered_cases = {}
        for r in rules:
            cid = str(r.case_id)
            covered_cases.setdefault(cid, []).append(r.days_before)

        tasks_q = await db.execute(
            select(Task).where(
                Task.is_deleted == False,
                Task.due_date.isnot(None),
                Task.status.not_in(["done", "cancelled"]),
            ).options(selectinload(Task.case))
        )
        tasks = tasks_q.scalars().all()

        covered = []
        uncovered = []
        for t in tasks:
            cid = str(t.case_id)
            case_title = (t.case.title if t.case else cid)[:35]
            due = t.due_date.date()
            days_left = (due - today).days
            task_title = t.title[:45]
            if cid in covered_cases:
                fire_days = sorted(covered_cases[cid])
                fires = [due - timedelta(days=d) for d in fire_days if 0 <= d <= days_left]
                covered.append((case_title, task_title, due, days_left, fire_days, fires))
            else:
                uncovered.append((case_title, task_title, due, days_left))

    await engine.dispose()

    print(f"\n{'='*70}")
    print(f"  TAREAS CUBIERTAS POR REGLAS ({len(covered)})")
    print(f"{'='*70}")
    for case_t, task_t, due, dl, fire_days, fires in sorted(covered, key=lambda x: x[2]):
        sign = "+" if dl >= 0 else ""
        fires_str = ", ".join(f.strftime("%d/%m/%Y") for f in fires) if fires else "ya pasaron"
        print(f"  [{sign}{dl}d]  Vence: {due}  |  Caso: {case_t}")
        print(f"         Tarea: {task_t}")
        print(f"         Avisos ({fire_days}d antes): {fires_str}")
        print()

    print(f"{'='*70}")
    print(f"  TAREAS SIN REGLAS EN SU CASO ({len(uncovered)})")
    print(f"{'='*70}")
    for case_t, task_t, due, dl in sorted(uncovered, key=lambda x: x[2]):
        sign = "+" if dl >= 0 else ""
        print(f"  [{sign}{dl}d]  Vence: {due}  |  Caso: {case_t}")
        print(f"         Tarea: {task_t}")
        print()

    print(f"\nRESUMEN: {len(covered)} con notificacion, {len(uncovered)} sin configurar")
    print(f"Fecha hoy (UTC): {today}\n")


asyncio.run(check())
