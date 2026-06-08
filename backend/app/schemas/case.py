from pydantic import BaseModel, Field
from typing import Optional, Any
import uuid
from datetime import datetime


class CaseResponse(BaseModel):
    """Case response — Spanish field names matching frontend Caso type."""
    id: uuid.UUID = Field(..., description="Case ID")
    titulo: Optional[str] = Field(None, description="Case title")
    descripcion: Optional[str] = Field(None, description="Description")
    estado: Optional[str] = Field(None, description="Status")
    tipoSolicitud: Optional[str] = Field(None, description="Case type")
    clienteId: Optional[str] = Field(None, description="Client ID")
    bufeteId: Optional[str] = Field(None, description="Law firm ID")
    abogadoPrincipalId: Optional[str] = Field(None, description="Lead lawyer ID")
    montoAsegurado: Optional[float] = Field(None, description="Budget amount")
    moneda: Optional[str] = Field(None, description="Currency: PEN or USD")
    fechaApertura: Optional[str] = Field(None, description="Open date")
    fechaCierre: Optional[str] = Field(None, description="Close date")
    createdAt: Optional[str] = Field(None, description="Creation timestamp")
    updatedAt: Optional[str] = Field(None, description="Update timestamp")

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    """Case list response — Spanish field names."""
    id: uuid.UUID = Field(..., description="Case ID")
    titulo: Optional[str] = Field(None, description="Case title")
    estado: Optional[str] = Field(None, description="Status")
    tipoSolicitud: Optional[str] = Field(None, description="Case type")
    createdAt: Optional[str] = Field(None, description="Creation timestamp")

    model_config = {"from_attributes": True}


class CaseCreate(BaseModel):
    """Create case request — Spanish field names to match frontend."""
    titulo: str
    descripcion: Optional[str] = None
    tipoSolicitud: str = "other"
    clienteId: Optional[str] = None
    abogadoPrincipalId: Optional[str] = None
    estado: Optional[str] = None
    # Billing
    tipoFacturacion: Optional[str] = None   # 'flat' | 'por_horas'
    monedaFacturacion: Optional[str] = "PEN"  # 'PEN' | 'USD'
    precioFacturacion: Optional[float] = None

    model_config = {"from_attributes": True}


class CaseUpdate(BaseModel):
    """Update case request — Spanish field names to match frontend."""
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipoSolicitud: Optional[str] = None
    clienteId: Optional[str] = None
    abogadoPrincipalId: Optional[str] = None
    estado: Optional[str] = None
    # Billing
    tipoFacturacion: Optional[str] = None
    monedaFacturacion: Optional[str] = None
    precioFacturacion: Optional[float] = None

    model_config = {"from_attributes": True}


class AddTeamMemberRequest(BaseModel):
    """Add team member request."""
    user_id: str
    role: str = "member"

    model_config = {"from_attributes": True}
