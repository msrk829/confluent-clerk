"""
Kafka Service for managing Kafka operations
"""
from kafka import KafkaProducer, KafkaConsumer, KafkaAdminClient
from kafka.admin import ConfigResource, ConfigResourceType, NewTopic
from kafka.errors import KafkaError, TopicAlreadyExistsError
from typing import List, Dict, Any, Optional
import logging
import json

from app.core.config import settings

logger = logging.getLogger(__name__)


class KafkaService:
    """Kafka Service for managing topics, ACLs, and configurations"""
    
    def __init__(self):
        self.bootstrap_servers = settings.kafka_bootstrap_servers_list
        self.security_protocol = settings.KAFKA_SECURITY_PROTOCOL
        
        # Initialize admin client
        self.admin_client = None
        self._init_admin_client()
    
    def _init_admin_client(self):
        """Initialize Kafka admin client"""
        try:
            self.admin_client = KafkaAdminClient(
                bootstrap_servers=settings.kafka_bootstrap_servers_list,
                security_protocol=self.security_protocol,
                client_id='kafka-admin-portal'
            )
            logger.info(f"Kafka admin client initialized with servers: {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka admin client: {str(e)}")
            self.admin_client = None
    
    def get_cluster_info(self) -> Dict[str, Any]:
        """
        Get Kafka cluster information
        
        Returns:
            Dictionary containing cluster information
        """
        if not self.admin_client:
            return {"error": "Admin client not initialized"}
        
        try:
            # Get cluster metadata
            metadata = self.admin_client.describe_cluster()
            
            return {
                "cluster_id": metadata.cluster_id if hasattr(metadata, 'cluster_id') else "unknown",
                "controller": metadata.controller if hasattr(metadata, 'controller') else None,
                "brokers": [
                    {
                        "id": broker.nodeId,
                        "host": broker.host,
                        "port": broker.port
                    }
                    for broker in metadata.brokers
                ] if hasattr(metadata, 'brokers') else [],
                "bootstrap_servers": self.bootstrap_servers
            }
        except Exception as e:
            logger.error(f"Error getting cluster info: {str(e)}")
            return {"error": str(e)}
    
    def list_topics(self) -> List[Dict[str, Any]]:
        """
        List all topics in the Kafka cluster
        
        Returns:
            List of topic information dictionaries
        """
        if not self.admin_client:
            return []
        
        try:
            # Get list of topic names
            topic_names = self.admin_client.list_topics()
            topics = []
            
            # For now, just return topic names without detailed metadata
            # to avoid the metadata parsing issues
            for topic_name in topic_names:
                topics.append({
                    "name": topic_name,
                    "partitions": 1,  # Default value
                    "replication_factor": 1,  # Default value
                    "is_internal": topic_name.startswith('_')  # Simple heuristic
                })
            
            return topics
        except Exception as e:
            logger.error(f"Error listing topics: {str(e)}")
            return []
    
    def create_topic(self, topic_name: str, num_partitions: int = 1, replication_factor: int = 1, 
                    config: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Create a new topic
        
        Args:
            topic_name: Name of the topic to create
            num_partitions: Number of partitions
            replication_factor: Replication factor
            config: Topic configuration
            
        Returns:
            Dictionary containing operation result
        """
        if not self.admin_client:
            return {"success": False, "error": "Admin client not initialized"}
        
        try:
            topic = NewTopic(
                name=topic_name,
                num_partitions=num_partitions,
                replication_factor=replication_factor,
                topic_configs=config or {}
            )
            
            result = self.admin_client.create_topics([topic])
            
            # Wait for the operation to complete
            for topic_name, future in result.items():
                try:
                    future.result()  # The result itself is None
                    logger.info(f"Topic '{topic_name}' created successfully")
                    return {"success": True, "message": f"Topic '{topic_name}' created successfully"}
                except TopicAlreadyExistsError:
                    logger.warning(f"Topic '{topic_name}' already exists")
                    return {"success": False, "error": f"Topic '{topic_name}' already exists"}
                except Exception as e:
                    logger.error(f"Error creating topic '{topic_name}': {str(e)}")
                    return {"success": False, "error": str(e)}
                    
        except Exception as e:
            logger.error(f"Error creating topic: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def delete_topic(self, topic_name: str) -> Dict[str, Any]:
        """
        Delete a topic
        
        Args:
            topic_name: Name of the topic to delete
            
        Returns:
            Dictionary containing operation result
        """
        if not self.admin_client:
            return {"success": False, "error": "Admin client not initialized"}
        
        try:
            result = self.admin_client.delete_topics([topic_name])
            
            # Wait for the operation to complete
            for topic_name, future in result.items():
                try:
                    future.result()
                    logger.info(f"Topic '{topic_name}' deleted successfully")
                    return {"success": True, "message": f"Topic '{topic_name}' deleted successfully"}
                except Exception as e:
                    logger.error(f"Error deleting topic '{topic_name}': {str(e)}")
                    return {"success": False, "error": str(e)}
                    
        except Exception as e:
            logger.error(f"Error deleting topic: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_topic_config(self, topic_name: str) -> Dict[str, Any]:
        """
        Get topic configuration
        
        Args:
            topic_name: Name of the topic
            
        Returns:
            Dictionary containing topic configuration
        """
        if not self.admin_client:
            return {"error": "Admin client not initialized"}
        
        try:
            resource = ConfigResource(ConfigResourceType.TOPIC, topic_name)
            result = self.admin_client.describe_configs([resource])
            
            for resource, future in result.items():
                try:
                    config = future.result()
                    return {
                        "topic": topic_name,
                        "configs": {
                            config_entry.name: config_entry.value
                            for config_entry in config.values()
                        }
                    }
                except Exception as e:
                    logger.error(f"Error getting config for topic '{topic_name}': {str(e)}")
                    return {"error": str(e)}
                    
        except Exception as e:
            logger.error(f"Error getting topic config: {str(e)}")
            return {"error": str(e)}
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to Kafka cluster
        
        Returns:
            Dictionary containing connection test result
        """
        try:
            if not self.admin_client:
                self._init_admin_client()
            
            if self.admin_client:
                # Try to get cluster metadata as a connection test
                topics = self.admin_client.list_topics()
                return {
                    "success": True,
                    "message": "Successfully connected to Kafka cluster",
                    "bootstrap_servers": self.bootstrap_servers,
                    "topics_count": len(topics)
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to initialize admin client",
                    "bootstrap_servers": self.bootstrap_servers
                }
        except Exception as e:
            logger.error(f"Kafka connection test failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "bootstrap_servers": self.bootstrap_servers
            }


# Global instance
kafka_service = KafkaService()