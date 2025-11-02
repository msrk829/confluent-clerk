"""
Request Service
Business logic for request operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.models import Request, RequestType, RequestStatus
from app.schemas.request import RequestCreate, RequestResponse


class RequestService:
    """Service for request operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_request(self, user_id: UUID, request_data: RequestCreate) -> Request:
        """Create a new request"""
        request = Request(
            user_id=user_id,
            request_type=request_data.request_type,
            details=request_data.details,
            rationale=request_data.rationale,
            status=RequestStatus.PENDING
        )
        
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request
    
    def get_user_requests(self, user_id: UUID) -> List[Request]:
        """Get all requests by a specific user"""
        return (
            self.db.query(Request)
            .filter(Request.user_id == user_id)
            .order_by(Request.created_at.desc())
            .all()
        )
    
    def get_user_request_by_id(self, user_id: UUID, request_id: UUID) -> Optional[Request]:
        """Get a specific request by ID for a specific user"""
        return (
            self.db.query(Request)
            .filter(Request.user_id == user_id, Request.id == request_id)
            .first()
        )
    
    def get_all_requests(self) -> List[Request]:
        """Get all requests (admin only)"""
        return (
            self.db.query(Request)
            .order_by(Request.created_at.desc())
            .all()
        )
    
    def get_pending_requests(self) -> List[Request]:
        """Get all pending requests (admin only)"""
        return (
            self.db.query(Request)
            .filter(Request.status == RequestStatus.PENDING)
            .order_by(Request.created_at.desc())
            .all()
        )
    
    def get_request_by_id(self, request_id: UUID) -> Optional[Request]:
        """Get request by ID"""
        return self.db.query(Request).filter(Request.id == request_id).first()
    
    def approve_request(self, request_id: UUID, admin_user_id: UUID) -> Optional[Request]:
        """Approve a request"""
        request = self.get_request_by_id(request_id)
        if request and request.status == RequestStatus.PENDING:
            request.status = RequestStatus.APPROVED
            request.admin_user_id = admin_user_id
            self.db.commit()
            self.db.refresh(request)
            return request
        return None
    
    def reject_request(
        self, 
        request_id: UUID, 
        admin_user_id: UUID, 
        rejection_reason: str
    ) -> Optional[Request]:
        """Reject a request"""
        request = self.get_request_by_id(request_id)
        if request and request.status == RequestStatus.PENDING:
            request.status = RequestStatus.REJECTED
            request.admin_user_id = admin_user_id
            request.rejection_reason = rejection_reason
            self.db.commit()
            self.db.refresh(request)
            return request
        return None
    
    def cancel_request(self, request_id: UUID, user_id: UUID) -> Optional[Request]:
        """Cancel a request (user can only cancel their own pending requests)"""
        request = self.get_request_by_id(request_id)
        if (request and 
            request.user_id == user_id and 
            request.status == RequestStatus.PENDING):
            request.status = RequestStatus.CANCELLED
            self.db.commit()
            self.db.refresh(request)
            return request
        return None