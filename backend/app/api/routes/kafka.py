"""
Kafka API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel

from app.services.kafka_service import kafka_service
from app.api.dependencies import get_current_user, require_admin
from app.db.models import User
from app.schemas.user import UserResponse

router = APIRouter()


class TopicCreateRequest(BaseModel):
    name: str
    partitions: int = 1
    replication_factor: int = 1
    config: Dict[str, str] = {}


@router.get("/cluster/info")
async def get_cluster_info(current_user: UserResponse = Depends(get_current_user)):
    """Get Kafka cluster information"""
    try:
        cluster_info = kafka_service.get_cluster_info()
        return cluster_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cluster/test")
async def test_connection(current_user: UserResponse = Depends(get_current_user)):
    """Test connection to Kafka cluster"""
    try:
        result = kafka_service.test_connection()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/topics")
async def debug_topics(current_user: UserResponse = Depends(get_current_user)):
    """Debug endpoint to test topic listing with detailed logging"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info("🔍 DEBUG: Starting topic listing debug")
        
        # Test basic connection first
        if not kafka_service.admin_client:
            logger.error("🔍 DEBUG: No admin client available")
            return {"error": "No admin client", "topics": []}
        
        logger.info("🔍 DEBUG: Admin client exists")
        
        # Try to list topics
        try:
            topic_names = kafka_service.admin_client.list_topics()
            logger.info(f"🔍 DEBUG: Raw topic names: {topic_names}")
            logger.info(f"🔍 DEBUG: Topic names type: {type(topic_names)}")
            
            return {
                "raw_topic_names": topic_names,
                "topic_names_type": str(type(topic_names)),
                "topic_count": len(topic_names) if topic_names else 0
            }
        except Exception as list_e:
            logger.error(f"🔍 DEBUG: Error listing topics: {str(list_e)}")
            return {"error": f"Error listing topics: {str(list_e)}", "topics": []}
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🔍 DEBUG: General error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topics")
async def get_all_topics(current_user: UserResponse = Depends(get_current_user)):
    """Get all Kafka topics"""
    try:
        topics = kafka_service.list_topics()
        return {"topics": topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/topics")
async def create_topic(
    topic_request: TopicCreateRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new Kafka topic (Admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = kafka_service.create_topic(
            topic_name=topic_request.name,
            num_partitions=topic_request.partitions,
            replication_factor=topic_request.replication_factor,
            config=topic_request.config
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/topics/{topic_name}")
async def delete_topic(
    topic_name: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a Kafka topic (Admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = kafka_service.delete_topic(topic_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topics/{topic_name}/config")
async def get_topic_config(
    topic_name: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get topic configuration"""
    try:
        config = kafka_service.get_topic_config(topic_name)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/acls")
async def get_all_acls(current_user: User = Depends(require_admin)):
    """Get all ACLs"""
    try:
        result = kafka_service.get_acls()
        if result.get("success", False):
            return {
                "acls": result.get("acls", []),
                "message": result.get("message", "ACLs retrieved successfully")
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Failed to retrieve ACLs"),
                "message": result.get("message", "ACL retrieval unavailable")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
