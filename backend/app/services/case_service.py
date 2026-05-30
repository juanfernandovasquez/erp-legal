"""
Case management business logic.
Handles case hierarchy validation, team access, and case operations.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import uuid

from app.models import Case, CaseTeam, User


async def validate_case_hierarchy(db: AsyncSession, parent_case_id: str) -> None:
    """
    Validate case hierarchy rules.
    Maximum 2 levels allowed (parent + 1 sub-case level).
    """
    parent_case = await db.get(Case, parent_case_id)

    if not parent_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent case not found",
        )

    # Check if parent is already a sub-case (would create 3 levels)
    # hierarchy_level is computed by checking parent_case_id chain
    if parent_case.parent_case_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create sub-cases of sub-cases (max 2 levels)",
        )


async def check_parent_can_close(db: AsyncSession, case_id: str) -> None:
    """
    Check if parent case can be closed.
    Parent cannot close if it has open sub-cases.
    """
    result = await db.execute(
        select(func.count(Case.id)).where(
            and_(
                Case.parent_case_id == case_id,
                Case.status != "closed",
                Case.is_deleted == False,
            )
        )
    )
    open_sub_cases = result.scalar()

    if open_sub_cases and open_sub_cases > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot close case with open sub-cases",
        )


async def generate_case_number(db: AsyncSession, law_firm_id: str) -> str:
    """
    Generate a unique case number for the law firm.
    Format: YEAR-FIRM-SEQUENCE (e.g., 2026-001-0001)
    """
    from datetime import datetime

    year = datetime.utcnow().year
    firm_seq = law_firm_id[:3].upper() if law_firm_id else "UNK"

    # Get next sequence number
    result = await db.execute(
        select(func.count(Case.id)).where(
            Case.law_firm_id == law_firm_id
        )
    )
    case_count = (result.scalar() or 0) + 1

    case_number = f"{year}-{firm_seq}-{case_count:04d}"
    return case_number


async def check_case_team_access(
    db: AsyncSession,
    case_id: str,
    current_user: User,
) -> None:
    """
    Verify user has access to a case via case team membership.
    Raises HTTPException if user is not on case team.
    """
    from app.utils.auth import check_role

    # Admins and senior lawyers can access all cases
    if check_role(current_user.role, ["admin_firma", "abogado_senior", "super_admin"]):
        return

    # Others must be explicitly on case team
    result = await db.execute(
        select(CaseTeam).where(
            and_(
                CaseTeam.case_id == case_id,
                CaseTeam.user_id == current_user.id,
                CaseTeam.is_deleted == False,
            )
        )
    )

    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this case",
        )
