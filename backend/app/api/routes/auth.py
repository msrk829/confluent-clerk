"""
Authentication API Routes
Handles LDAP login and JWT token generation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.db.database import get_db
from app.schemas.user import UserLogin, Token, UserResponse
from app.services.auth_service import AuthService
from app.services.ldap_auth import ldap_auth_service
from app.services.user_service import UserService
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user via LDAP and return JWT token
    
    - Validates credentials against LDAP server
    - Creates user record on first login
    - Determines admin status from LDAP group membership
    - Returns JWT token for subsequent requests
    """
    logger.info(f"🔍 LOGIN ATTEMPT: Starting login for user: {credentials.username}")
    
    try:
        # Authenticate with LDAP
        logger.info(f"🔍 LOGIN ATTEMPT: Authenticating with LDAP for user: {credentials.username}")
        ldap_user = ldap_auth_service.authenticate(credentials.username, credentials.password)
        
        if not ldap_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Get or create user in database
        user_service = UserService(db)
        user = user_service.get_user_by_username(credentials.username)
        
        if not user:
            # First time login - create user
            logger.info(f"🔍 LOGIN ATTEMPT: Creating new user for: {credentials.username}")
            user = user_service.create_user(
                username=credentials.username,
                email=ldap_user['email'],
                is_admin=ldap_user['is_admin']
            )
            
            # Log user creation
            logger.info(f"🔍 LOGIN ATTEMPT: About to call audit_service.log_action for USER_CREATED")
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=str(user.id),
                action="USER_CREATED",
                resource_type="USER",
                resource_id=str(user.id),
                details={"source": "LDAP", "is_admin": ldap_user['is_admin']}
            )
            logger.info(f"🔍 LOGIN ATTEMPT: Successfully called audit_service.log_action for USER_CREATED")
        else:
            # Update last login
            print(f"🔍 LOGIN ATTEMPT: Updating existing user: {credentials.username}")
            print(f"🔍 LOGIN ATTEMPT: Current user.is_admin: {user.is_admin}, LDAP is_admin: {ldap_user['is_admin']}")
            user.last_login = datetime.utcnow()
            # Sync admin status from LDAP
            if user.is_admin != ldap_user['is_admin']:
                print(f"🔍 LOGIN ATTEMPT: Admin status changed for user: {credentials.username}, updating from {user.is_admin} to {ldap_user['is_admin']}")
                user.is_admin = ldap_user['is_admin']
                audit_service = AuditService(db)
                audit_service.log_action(
                    user_id=str(user.id),
                    action="USER_ROLE_UPDATED",
                    resource_type="USER",
                    resource_id=str(user.id),
                    details={"is_admin": ldap_user['is_admin']}
                )
                print(f"🔍 LOGIN ATTEMPT: Successfully called audit_service.log_action for USER_ROLE_UPDATED")
            else:
                print(f"🔍 LOGIN ATTEMPT: Admin status unchanged for user: {credentials.username}, is_admin: {user.is_admin}")
            db.commit()
            print(f"🔍 LOGIN ATTEMPT: After commit, user.is_admin: {user.is_admin}")
            
        # Refresh user from database to ensure we have the latest data
        db.refresh(user)
        print(f"🔍 LOGIN ATTEMPT: After refresh, user.is_admin: {user.is_admin}")
        
        # Generate JWT token
        auth_service = AuthService()
        access_token = auth_service.create_access_token(
            data={"sub": user.username, "user_id": str(user.id)}
        )
        
        # Debug logging to check user data
        logger.info(f"Login successful for user: {user.username}, is_admin: {user.is_admin}, id: {user.id}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.from_orm(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


@router.post("/logout")
async def logout():
    """
    Logout endpoint
    
    Note: Since we're using JWT tokens, actual logout is handled client-side
    by removing the token. Server-side token invalidation would require
    a token blacklist (not implemented in MVP).
    """
    return {"message": "Logout successful"}
