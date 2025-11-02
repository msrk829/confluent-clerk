"""
Pydantic schemas for Request API
"""
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID
from typing import Optional, Dict, Any
from app.db.models import RequestType, RequestStatus, ACLOperation, ACLResourceType
import re


class TopicRequestDetails(BaseModel):
    """Details for topic creation request"""
    topic_name: str = Field(..., min_length=1, max_length=255)
    partitions: int = Field(..., ge=1, le=100)
    replication_factor: int = Field(..., ge=1, le=3)
    description: Optional[str] = Field(None, max_length=500)

    @validator('topic_name')
    def validate_topic_name(cls, v):
        """Validate topic name format"""
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Topic name can only contain letters, numbers, dots, underscores, and hyphens')
        return v


class ACLRequestDetails(BaseModel):
    """Details for ACL request"""
    principal: str = Field(..., min_length=1)
    operation: ACLOperation
    resource_type: ACLResourceType
    resource_name: str = Field(..., min_length=1)
    host_pattern: str = Field(default="*")


class RequestCreate(BaseModel):
    """Schema for creating a request"""
    request_type: RequestType
    details: Dict[str, Any]
    rationale: Optional[str] = Field(None, min_length=10, max_length=1000)

    @validator('details')
    def validate_details(cls, v, values):
        """Validate details based on request type"""
        request_type = values.get('request_type')
        if request_type == RequestType.TOPIC:
            TopicRequestDetails(**v)
        elif request_type == RequestType.ACL:
            ACLRequestDetails(**v)
        return v


class RequestUpdate(BaseModel):
    """Schema for updating request (admin only)"""
    status: RequestStatus
    rejection_reason: Optional[str] = Field(None, min_length=10, max_length=500)

    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        """Rejection reason required when rejecting"""
        if values.get('status') == RequestStatus.REJECTED and not v:
            raise ValueError('Rejection reason is required when rejecting a request')
        return v


class RequestResponse(BaseModel):
    """Schema for request response"""
    id: UUID
    user_id: UUID
    request_type: RequestType
    status: RequestStatus
    details: Dict[str, Any]
    rationale: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    admin_user_id: Optional[UUID]
    rejection_reason: Optional[str]

    class Config:
        from_attributes = True
