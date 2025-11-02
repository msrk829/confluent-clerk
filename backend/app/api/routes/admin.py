"""
Admin API Routes
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/requests/pending")
async def get_pending_requests():
    """Get all pending requests"""
    return {"message": "Pending requests - to be implemented"}

@router.patch("/requests/{request_id}/approve")
async def approve_request(request_id: str):
    """Approve a request"""
    return {"message": f"Approve request {request_id} - to be implemented"}

@router.patch("/requests/{request_id}/reject")
async def reject_request(request_id: str):
    """Reject a request"""
    return {"message": f"Reject request {request_id} - to be implemented"}
