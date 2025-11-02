"""
User API Routes
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/me")
async def get_current_user_info():
    """Get current user information"""
    return {"message": "User info endpoint - to be implemented"}

@router.get("/topics")
async def get_user_topics():
    """Get topics accessible by current user"""
    return {"message": "User topics endpoint - to be implemented"}
