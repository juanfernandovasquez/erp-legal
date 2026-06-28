import uuid
from typing import Optional
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class NotificationRule(BaseModel):
    """Per-case deadline notification rules."""

    __tablename__ = "notification_rules"

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    days_before: Mapped[int] = mapped_column(Integer, nullable=False)
    notify_assignee: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_supervisors: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    case: Mapped["Case"] = relationship("Case", foreign_keys=[case_id])
