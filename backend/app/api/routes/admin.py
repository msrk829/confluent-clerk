"""Admin Routes
API endpoints for admin operations"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from pydantic import BaseModel

from app.db.database import get_db
from app.schemas.request import RequestResponse
from app.api.dependencies import get_current_admin_user
from app.db.models import User
from app.services.request_service import RequestService
from app.services.audit_service import AuditService

router = APIRouter()


class RequestActionRequest(BaseModel):
    """Request for approve/reject actions"""
    rejection_reason: str = None


@router.get("/requests", response_model=List[RequestResponse])
async def get_all_requests(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all requests (admin only)"""
    try:
        request_service = RequestService(db)
        requests = request_service.get_all_requests()
        
        return [
            RequestResponse(
                id=req.id,
                user_id=req.user_id,
                request_type=req.request_type,
                details=req.details,
                rationale=req.rationale,
                status=req.status,
                created_at=req.created_at,
                approved_at=req.approved_at,
                rejected_at=req.rejected_at,
                admin_user_id=req.admin_user_id,
                rejection_reason=req.rejection_reason
            )
            for req in requests
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch all requests: {str(e)}"
        )


@router.get("/requests/pending", response_model=List[RequestResponse])
async def get_pending_requests(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all pending requests (admin only)"""
    try:
        request_service = RequestService(db)
        requests = request_service.get_pending_requests()
        
        return [
            RequestResponse(
                id=req.id,
                user_id=req.user_id,
                request_type=req.request_type,
                details=req.details,
                rationale=req.rationale,
                status=req.status,
                created_at=req.created_at,
                approved_at=req.approved_at,
                rejected_at=req.rejected_at,
                admin_user_id=req.admin_user_id,
                rejection_reason=req.rejection_reason
            )
            for req in requests
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending requests: {str(e)}"
        )


@router.patch("/requests/{request_id}/approve", response_model=RequestResponse)
async def approve_request(
    request_id: UUID,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Approve a request (admin only)"""
    try:
        request_service = RequestService(db)
        audit_service = AuditService(db)
        
        approved_request = request_service.approve_request(request_id, current_admin.id)
        
        if not approved_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or cannot be approved"
            )
        
        # Log the approval action
        audit_service.log_action(
            user_id=current_admin.id,
            action="REQUEST_APPROVED",
            resource_type="REQUEST",
            resource_id=str(request_id),
            details={
                "request_type": approved_request.request_type,
                "topic_name": approved_request.details.get("topic_name") if approved_request.details else None,
                "approved_by": current_admin.username
            },
            ip_address=request.client.host if request.client else None
        )
        
        return RequestResponse(
            id=approved_request.id,
            user_id=approved_request.user_id,
            request_type=approved_request.request_type,
            details=approved_request.details,
            rationale=approved_request.rationale,
            status=approved_request.status,
            created_at=approved_request.created_at,
            approved_at=approved_request.approved_at,
            rejected_at=approved_request.rejected_at,
            admin_user_id=approved_request.admin_user_id,
            rejection_reason=approved_request.rejection_reason
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve request: {str(e)}"
        )


@router.patch("/requests/{request_id}/reject", response_model=RequestResponse)
async def reject_request(
    request_id: UUID,
    action_request: RequestActionRequest,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Reject a request (admin only)"""
    try:
        if not action_request.rejection_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required"
            )
        
        request_service = RequestService(db)
        audit_service = AuditService(db)
        
        rejected_request = request_service.reject_request(
            request_id, 
            current_admin.id, 
            action_request.rejection_reason
        )
        
        if not rejected_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or cannot be rejected"
            )
        
        # Log the rejection action
        audit_service.log_action(
            user_id=current_admin.id,
            action="REQUEST_REJECTED",
            resource_type="REQUEST",
            resource_id=str(request_id),
            details={
                "request_type": rejected_request.request_type,
                "topic_name": rejected_request.details.get("topic_name") if rejected_request.details else None,
                "rejected_by": current_admin.username,
                "rejection_reason": action_request.rejection_reason
            },
            ip_address=request.client.host if request.client else None
        )
        
        return RequestResponse(
            id=rejected_request.id,
            user_id=rejected_request.user_id,
            request_type=rejected_request.request_type,
            details=rejected_request.details,
            rationale=rejected_request.rationale,
            status=rejected_request.status,
            created_at=rejected_request.created_at,
            approved_at=rejected_request.approved_at,
            rejected_at=rejected_request.rejected_at,
            admin_user_id=rejected_request.admin_user_id,
            rejection_reason=rejected_request.rejection_reason
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject request: {str(e)}"
        )
