"""
SQLAlchemy Database Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.database import Base


class RequestType(str, enum.Enum):
    """Request type enumeration"""
    TOPIC = "TOPIC"
    ACL = "ACL"


class RequestStatus(str, enum.Enum):
    """Request status enumeration"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class ACLOperation(str, enum.Enum):
    """ACL operation enumeration"""
    READ = "READ"
    WRITE = "WRITE"
    CREATE = "CREATE"
    DELETE = "DELETE"
    ALTER = "ALTER"
    DESCRIBE = "DESCRIBE"
    CLUSTER_ACTION = "CLUSTER_ACTION"
    ALL = "ALL"


class ACLResourceType(str, enum.Enum):
    """ACL resource type enumeration"""
    TOPIC = "TOPIC"
    GROUP = "GROUP"
    CLUSTER = "CLUSTER"
    TRANSACTIONAL_ID = "TRANSACTIONAL_ID"


class User(Base):
    """User model"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    requests = relationship("Request", back_populates="user", foreign_keys="Request.user_id")
    approved_requests = relationship("Request", back_populates="admin_user", foreign_keys="Request.admin_user_id")
    audit_logs = relationship("AuditLog", back_populates="user")


class Request(Base):
    """Request model for topic/ACL requests"""
    __tablename__ = "requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    request_type = Column(SQLEnum(RequestType), nullable=False)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False, index=True)
    details = Column(JSON, nullable=False)  # Store request-specific data
    rationale = Column(Text)  # User's justification for the request
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    approved_at = Column(DateTime(timezone=True))
    rejected_at = Column(DateTime(timezone=True))
    
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    rejection_reason = Column(Text)

    # Relationships
    user = relationship("User", back_populates="requests", foreign_keys=[user_id])
    admin_user = relationship("User", back_populates="approved_requests", foreign_keys=[admin_user_id])


class AuditLog(Base):
    """Immutable audit log for all operations"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # USER, TOPIC, ACL, REQUEST
    entity_id = Column(String(255))  # ID or name of affected entity
    changes = Column(JSON)  # Store before/after state
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String(50))

    # Relationships
    user = relationship("User", back_populates="audit_logs")
