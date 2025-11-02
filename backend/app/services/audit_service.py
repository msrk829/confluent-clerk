"""
Audit Service
Handles audit logging for compliance and tracking
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import AuditLog
import logging

logger = logging.getLogger(__name__)


class AuditService:
    """Service for audit logging"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_action(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        **kwargs  # Catch any unexpected parameters
    ) -> AuditLog:
        """
        Create an immutable audit log entry
        
        Args:
            user_id: ID of user performing action
            action: Action performed (e.g., TOPIC_CREATED, REQUEST_APPROVED)
            resource_type: Type of resource affected (USER, TOPIC, ACL, REQUEST)
            resource_id: ID of affected resource
            details: Dictionary of additional details
            ip_address: IP address of client
            
        Returns:
            Created audit log entry
        """
        # Check for unexpected parameters
        if kwargs:
            raise ValueError(f"Unexpected keyword arguments: {list(kwargs.keys())}")
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=resource_type,
            entity_id=resource_id,
            changes=details or {},
            ip_address=ip_address
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        return audit_log
