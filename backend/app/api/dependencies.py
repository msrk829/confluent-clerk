"""
API Dependencies
Centralized location for FastAPI dependencies
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.auth_service import get_current_user, get_current_admin_user
from app.db.models import User


def require_admin(current_user: User = Depends(get_current_admin_user)) -> User:
    """
    Dependency that requires admin privileges
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


__all__ = ["get_db", "get_current_user", "get_current_admin_user", "require_admin"]