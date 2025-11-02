"""
Audit Service
Handles audit logging for compliance and tracking
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import AuditLog


class AuditService:
    """Service for audit logging"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_action(
        self,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """
        Create an immutable audit log entry
        
        Args:
            user_id: ID of user performing action
            action: Action performed (e.g., TOPIC_CREATED, REQUEST_APPROVED)
            entity_type: Type of entity affected (USER, TOPIC, ACL, REQUEST)
            entity_id: ID of affected entity
            changes: Dictionary of changes made
            ip_address: IP address of client
            
        Returns:
            Created audit log entry
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes or {},
            ip_address=ip_address
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        return audit_log
