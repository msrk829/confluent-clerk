"""
User API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.db.models import User
from app.schemas.user import UserResponse
from app.services.kafka_service import kafka_service
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    try:
        # Log the user info access
        audit_service = AuditService(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="USER_INFO_ACCESS",
            resource_type="USER",
            resource_id=str(current_user.id),
            details={"username": current_user.username}
        )
        
        return UserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            is_admin=current_user.is_admin,
            created_at=current_user.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )

@router.get("/topics")
async def get_user_topics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get topics accessible by current user"""
    try:
        # For now, return all topics (in a real implementation, 
        # this would filter based on user permissions/ACLs)
        topics = kafka_service.list_topics()
        
        # Log the topics access
        audit_service = AuditService(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="TOPICS_LIST_ACCESS",
            resource_type="KAFKA_TOPICS",
            resource_id="all",
            details={"topic_count": len(topics)}
        )
        
        return {
            "topics": topics,
            "user_id": current_user.id,
            "username": current_user.username
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user topics: {str(e)}"
        )
