"""
Law firm management endpoints.
Handles current firm details and settings updates.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.responses import success_response, error_response
from app.utils.auth import get_current_user, check_role
from app.schemas.law_firm import LawFirmUpdate
from app.models import User, LawFirm
from app.services.audit_service import audit_log

router = APIRouter(tags=["law_firms"])


@router.get(
    "/current",
    response_model=dict,
    summary="Get current law firm details",
    description="Retrieve details of the law firm associated with current user",
)
async def get_current_law_firm(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current law firm details.
    All users have access to their law firm's information.
    """
    law_firm = await db.get(LawFirm, current_user.law_firm_id)

    if not law_firm or law_firm.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Law firm not found",
        )

    return success_response(
        data={
            "id": law_firm.id,
            "name": law_firm.name,
            "registration_number": law_firm.registration_number,
            "email": law_firm.email,
            "phone": law_firm.phone,
            "street_address": law_firm.street_address,
            "city": law_firm.city,
            "state": law_firm.state,
            "postal_code": law_firm.postal_code,
            "country": law_firm.country,
            "website": law_firm.website,
            "is_active": law_firm.is_active,
            "created_at": law_firm.created_at.isoformat() if law_firm.created_at else None,
            "updated_at": law_firm.updated_at.isoformat() if law_firm.updated_at else None,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.patch(
    "/current",
    response_model=dict,
    summary="Update law firm settings",
    description="Update law firm details (admin_firma only)",
)
async def update_current_law_firm(
    request: LawFirmUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update law firm settings.
    Only users with admin_firma role can update law firm details.
    """
    # Check authorization
    if not check_role(current_user.role, ["admin_firma", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators can update law firm settings",
        )

    law_firm = await db.get(LawFirm, current_user.law_firm_id)

    if not law_firm or law_firm.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Law firm not found",
        )

    # Store old values for audit trail
    old_values = {
        "name": law_firm.name,
        "email": law_firm.email,
        "phone": law_firm.phone,
        "address": law_firm.address,
        "city": law_firm.city,
        "state": law_firm.state,
        "postal_code": law_firm.postal_code,
        "country": law_firm.country,
        "website": law_firm.website,
    }

    # Update fields if provided
    if request.name is not None:
        law_firm.name = request.name
    if request.email is not None:
        law_firm.email = request.email
    if request.phone is not None:
        law_firm.phone = request.phone
    if request.street_address is not None:
        law_firm.street_address = request.street_address
    if request.city is not None:
        law_firm.city = request.city
    if request.state is not None:
        law_firm.state = request.state
    if request.postal_code is not None:
        law_firm.postal_code = request.postal_code
    if request.country is not None:
        law_firm.country = request.country
    if request.website is not None:
        law_firm.website = request.website

    law_firm.updated_at = datetime.utcnow()
    await db.commit()

    # Log the update
    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="LawFirm",
        entity_id=law_firm.id,
        description="Law firm settings updated",
        old_values=old_values,
        new_values={
            "name": law_firm.name,
            "email": law_firm.email,
            "phone": law_firm.phone,
            "street_address": law_firm.street_address,
            "city": law_firm.city,
            "state": law_firm.state,
            "postal_code": law_firm.postal_code,
            "country": law_firm.country,
            "website": law_firm.website,
        },
    )

    return success_response(
        data={
            "id": law_firm.id,
            "name": law_firm.name,
            "registration_number": law_firm.registration_number,
            "email": law_firm.email,
            "phone": law_firm.phone,
            "street_address": law_firm.street_address,
            "city": law_firm.city,
            "state": law_firm.state,
            "postal_code": law_firm.postal_code,
            "country": law_firm.country,
            "website": law_firm.website,
            "is_active": law_firm.is_active,
            "created_at": law_firm.created_at.isoformat() if law_firm.created_at else None,
            "updated_at": law_firm.updated_at.isoformat() if law_firm.updated_at else None,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )
