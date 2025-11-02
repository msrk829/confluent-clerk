"""
Authentication API Routes
Handles LDAP login and JWT token generation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.schemas.user import UserLogin, Token, UserResponse
from app.services.auth_service import AuthService
from app.services.ldap_service import LDAPService
from app.services.user_service import UserService
from app.services.audit_service import AuditService

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
    try:
        # Authenticate with LDAP
        ldap_service = LDAPService()
        ldap_user = ldap_service.authenticate(credentials.username, credentials.password)
        
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
            user = user_service.create_user(
                username=credentials.username,
                email=ldap_user['email'],
                is_admin=ldap_user['is_admin']
            )
            
            # Log user creation
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=str(user.id),
                action="USER_CREATED",
                entity_type="USER",
                entity_id=str(user.id),
                changes={"source": "LDAP", "is_admin": ldap_user['is_admin']}
            )
        else:
            # Update last login
            user.last_login = datetime.utcnow()
            # Sync admin status from LDAP
            if user.is_admin != ldap_user['is_admin']:
                user.is_admin = ldap_user['is_admin']
                audit_service = AuditService(db)
                audit_service.log_action(
                    user_id=str(user.id),
                    action="USER_ROLE_UPDATED",
                    entity_type="USER",
                    entity_id=str(user.id),
                    changes={"is_admin": ldap_user['is_admin']}
                )
            db.commit()
        
        # Generate JWT token
        auth_service = AuthService()
        access_token = auth_service.create_access_token(
            data={"sub": user.username, "user_id": str(user.id)}
        )
        
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
