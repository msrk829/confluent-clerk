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
        # List all topics first
        topics = kafka_service.list_topics()
        
        # Try to filter based on ACLs for the current user principal
        try:
            acl_result = kafka_service.get_acls()
            if acl_result.get("success"):
                username = (current_user.username or "").lower()
                user_topic_names = set()
                for acl in acl_result.get("acls", []):
                    principal = str(acl.get("principal", "")).lower()
                    resource_type = str(acl.get("resource_type", "")).upper()
                    resource_name = acl.get("resource_name")
                    if username and username in principal and resource_type == "TOPIC" and resource_name:
                        user_topic_names.add(resource_name)
                if user_topic_names:
                    topics = [t for t in topics if isinstance(t, dict) and t.get("name") in user_topic_names]
        except Exception:
            # If ACL retrieval fails, return all topics (non-filtered)
            pass
        
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

@router.get("/acls")
async def get_user_acls(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ACLs specific to the authenticated user"""
    try:
        result = kafka_service.get_acls()
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to retrieve ACLs"))
        username = (current_user.username or "").lower()
        filtered = []
        for acl in result.get("acls", []):
            principal = str(acl.get("principal", "")).lower()
            if username and username in principal:
                filtered.append(acl)
        # Log ACL access
        audit_service = AuditService(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="ACL_LIST_ACCESS",
            resource_type="ACL",
            resource_id="user",
            details={"acl_count": len(filtered)}
        )
        return {"acls": filtered}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
