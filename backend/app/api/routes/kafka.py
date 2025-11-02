"""
Kafka API Routes
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/topics")
async def get_all_topics():
    """Get all Kafka topics"""
    return {"message": "Get topics - to be implemented"}

@router.get("/acls")
async def get_all_acls():
    """Get all ACLs"""
    return {"message": "Get ACLs - to be implemented"}
