"""
Audit-related Pydantic schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class AuditLogResponse(BaseModel):
    """Audit log response schema"""
    id: UUID
    user_id: UUID
    action: str
    entity_type: str
    entity_id: Optional[str]
    changes: Dict[str, Any]
    timestamp: datetime
    ip_address: Optional[str]
    
    class Config:
        from_attributes = True