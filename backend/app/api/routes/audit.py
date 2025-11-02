"""
Audit Log API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.api.dependencies import get_db, get_current_user, require_admin
from app.db.models import AuditLog, User
from app.schemas.audit import AuditLogResponse

router = APIRouter()

@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    user_id: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None)
):
    """
    Retrieve audit logs with optional filtering
    
    Args:
        limit: Maximum number of logs to return (max 1000)
        offset: Number of logs to skip
        user_id: Filter by user ID
        action: Filter by action type
        entity_type: Filter by entity type
        start_date: Filter logs after this date
        end_date: Filter logs before this date
    """
    try:
        query = db.query(AuditLog)
        
        # Apply filters
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        
        # Order by timestamp descending (newest first)
        query = query.order_by(AuditLog.timestamp.desc())
        
        # Apply pagination
        audit_logs = query.offset(offset).limit(limit).all()
        
        return audit_logs
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve audit logs: {str(e)}"
        )
