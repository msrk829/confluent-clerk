"""
Request API Routes for Users
"""
from fastapi import APIRouter

router = APIRouter()

@router.post("/topic")
async def create_topic_request():
    """Create topic request"""
    return {"message": "Create topic request - to be implemented"}

@router.post("/acl")
async def create_acl_request():
    """Create ACL request"""
    return {"message": "Create ACL request - to be implemented"}

@router.get("/")
async def get_user_requests():
    """Get all requests by current user"""
    return {"message": "Get user requests - to be implemented"}
