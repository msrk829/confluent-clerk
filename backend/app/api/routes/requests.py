"""User Request Routes
API endpoints for user request operations"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.schemas.request import RequestCreate, RequestResponse
from app.api.dependencies import get_current_user
from app.db.models import User, RequestType
from app.services.request_service import RequestService
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/topic", response_model=RequestResponse)
async def create_topic_request(
    request_data: RequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new topic request"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Creating topic request for user {current_user.username}")
        logger.info(f"Request data: {request_data.dict()}")
        
        # Ensure this is a topic request
        if request_data.request_type != RequestType.TOPIC:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request type for topic endpoint"
            )
        
        request_service = RequestService(db)
        audit_service = AuditService(db)
        
        created_request = request_service.create_request(current_user.id, request_data)
        
        # Log the request creation
        audit_service.log_action(
            user_id=current_user.id,
            action="TOPIC_REQUEST_CREATED",
            resource_type="REQUEST",
            resource_id=str(created_request.id),
            details={
                "request_type": "TOPIC",
                "topic_name": request_data.details.get("topic_name") if request_data.details else None,
                "rationale": request_data.rationale
            },
            ip_address=request.client.host if request.client else None
        )
        
        return RequestResponse(
            id=created_request.id,
            user_id=created_request.user_id,
            request_type=created_request.request_type,
            details=created_request.details,
            rationale=created_request.rationale,
            status=created_request.status,
            created_at=created_request.created_at,
            approved_at=created_request.approved_at,
            rejected_at=created_request.rejected_at,
            admin_user_id=created_request.admin_user_id,
            rejection_reason=created_request.rejection_reason
        )
    except Exception as e:
        logger.error(f"Error creating topic request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create topic request: {str(e)}"
        )


@router.post("/acl", response_model=RequestResponse)
async def create_acl_request(
    request_data: RequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ACL request"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Creating ACL request for user {current_user.username}")
        logger.info(f"Request data: {request_data.dict()}")
        
        # Ensure this is an ACL request
        if request_data.request_type != RequestType.ACL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request type for ACL endpoint"
            )
        
        request_service = RequestService(db)
        audit_service = AuditService(db)
        
        created_request = request_service.create_request(current_user.id, request_data)
        
        # Log the request creation
        audit_service.log_action(
            user_id=current_user.id,
            action="ACL_REQUEST_CREATED",
            resource_type="REQUEST",
            resource_id=str(created_request.id),
            details={
                "request_type": "ACL",
                "topic_name": request_data.details.get("topic_name") if request_data.details else None,
                "permission": request_data.details.get("permission") if request_data.details else None,
                "rationale": request_data.rationale
            },
            ip_address=request.client.host if request.client else None
        )
        
        return RequestResponse(
            id=created_request.id,
            user_id=created_request.user_id,
            request_type=created_request.request_type,
            details=created_request.details,
            rationale=created_request.rationale,
            status=created_request.status,
            created_at=created_request.created_at,
            approved_at=created_request.approved_at,
            rejected_at=created_request.rejected_at,
            admin_user_id=created_request.admin_user_id,
            rejection_reason=created_request.rejection_reason
        )
    except Exception as e:
        logger.error(f"Error creating ACL request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ACL request: {str(e)}"
        )


@router.get("/", response_model=List[RequestResponse])
async def get_user_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all requests for the current user"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Getting requests for user {current_user.username} (ID: {current_user.id})")
        
        request_service = RequestService(db)
        requests = request_service.get_user_requests(current_user.id)
        
        logger.info(f"Found {len(requests)} requests for user")
        
        response_list = []
        for req in requests:
            logger.info(f"Processing request {req.id}: type={req.request_type}, status={req.status}")
            response_list.append(RequestResponse(
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
            ))
        
        return response_list
    except Exception as e:
        logger.error(f"Error getting user requests: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user requests: {str(e)}"
        )


@router.get("/{request_id}", response_model=RequestResponse)
async def get_user_request_by_id(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific request by ID for the current user"""
    try:
        logger.info(f"Getting request {request_id} for user {current_user.id}")
        
        request_service = RequestService(db)
        request = request_service.get_user_request_by_id(current_user.id, request_id)
        
        if not request:
            logger.warning(f"Request {request_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        logger.info(f"Successfully retrieved request {request_id} for user {current_user.id}")
        
        response = RequestResponse(
            id=request.id,
            user_id=request.user_id,
            request_type=request.request_type.value,
            status=request.status.value,
            details=request.details,
            rationale=request.rationale,
            created_at=request.created_at,
            approved_at=request.approved_at,
            rejected_at=request.rejected_at,
            admin_user_id=request.admin_user_id,
            rejection_reason=request.rejection_reason
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting request {request_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch request: {str(e)}"
        )
