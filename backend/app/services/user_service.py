"""
User Service
Business logic for user operations
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import User


class UserService:
    """Service for user operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def create_user(self, username: str, email: str, is_admin: bool = False) -> User:
        """Create new user"""
        user = User(
            username=username,
            email=email,
            is_admin=is_admin,
            is_active=True
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def update_user(self, user: User) -> User:
        """Update existing user"""
        self.db.commit()
        self.db.refresh(user)
        return user
