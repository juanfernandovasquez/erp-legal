"""
Client portal schemas.
"""

from pydantic import BaseModel
from typing import Optional


class ClientPortalLoginRequest(BaseModel):
    ruc: str
    password: str
