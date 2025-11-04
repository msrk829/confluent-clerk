"""
Kafka Service for managing Kafka operations
"""
from kafka import KafkaProducer, KafkaConsumer, KafkaAdminClient
from kafka.admin import ConfigResource, ConfigResourceType, NewTopic, ACL, ACLFilter, ACLOperation, ACLPermissionType, ResourcePattern, ResourceType
from kafka.errors import KafkaError, TopicAlreadyExistsError, UnknownError, SecurityDisabledError

# Confluent Kafka imports for improved ACL handling
from confluent_kafka.admin import (
    AdminClient,
    AclBinding,
    AclBindingFilter,
    ResourceType as ConfluentResourceType,
    ResourcePatternType,
    AclOperation as ConfluentAclOperation,
    AclPermissionType as ConfluentAclPermissionType,
)
from confluent_kafka import KafkaException

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
        
        # Initialize admin clients
        self.admin_client = None  # kafka-python admin client
        self.confluent_admin_client = None  # confluent-kafka admin client
        self._init_admin_client()
    
    def _init_admin_client(self):
        """Initialize Kafka admin clients"""
        try:
            logger.info("Initializing Kafka admin clients...")
            
            # Initialize kafka-python admin client
            self.admin_client = KafkaAdminClient(
                bootstrap_servers=settings.kafka_bootstrap_servers_list,
                security_protocol=self.security_protocol,
                client_id='kafka-admin-portal'
            )
            logger.info("kafka-python admin client initialized successfully")
            
            # Initialize confluent-kafka admin client for ACL operations
            confluent_config = {
                'bootstrap.servers': ','.join(settings.kafka_bootstrap_servers_list),
                'security.protocol': self.security_protocol,
                'client.id': 'kafka-admin-portal-confluent'
            }
            logger.info(f"Confluent config: {confluent_config}")
            self.confluent_admin_client = AdminClient(confluent_config)
            logger.info("confluent-kafka admin client initialized successfully")
            
            logger.info(f"Kafka admin clients initialized with servers: {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka admin clients: {str(e)}")
            logger.exception("Full exception details:")
            self.admin_client = None
            self.confluent_admin_client = None
    
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
            # Get list of topic names first
            topic_names = self.admin_client.list_topics()
            topics = []
            
            logger.info(f"Found {len(topic_names)} topics")
            
            # Use admin client to get detailed topic metadata
            try:
                # Get topic metadata using describe_topics
                logger.info(f"Calling describe_topics for {len(topic_names)} topics")
                topic_metadata_response = self.admin_client.describe_topics(topic_names)
                logger.info(f"describe_topics returned response type: {type(topic_metadata_response)}")
                
                # Let's inspect the actual structure of the response
                if topic_metadata_response:
                    logger.info(f"First item type: {type(topic_metadata_response[0])}")
                    logger.info(f"First item: {topic_metadata_response[0]}")
                    if hasattr(topic_metadata_response[0], '__dict__'):
                        logger.info(f"First item attributes: {dir(topic_metadata_response[0])}")
                
                # describe_topics returns a list - let's handle it properly
                topic_metadata = {}
                if isinstance(topic_metadata_response, list):
                    for item in topic_metadata_response:
                        # Check if it's a TopicMetadata object or a dict
                        if hasattr(item, 'topic'):
                            # It's a TopicMetadata object
                            topic_metadata[item.topic] = item
                        elif isinstance(item, dict) and 'topic' in item:
                            # It's a dict with topic key
                            topic_metadata[item['topic']] = item
                        else:
                            logger.warning(f"Unknown item structure: {type(item)} - {item}")
                    
                    logger.info(f"Converted to dict with {len(topic_metadata)} topics")
                    logger.info(f"Topics with metadata: {list(topic_metadata.keys())[:5]}...")  # Show first 5
                else:
                    logger.warning(f"Unexpected response type: {type(topic_metadata_response)}")
                
                for topic_name in topic_names:
                    try:
                        if topic_name in topic_metadata:
                            topic_info = topic_metadata[topic_name]
                            
                            # Handle both TopicMetadata objects and dicts
                            if hasattr(topic_info, 'partitions'):
                                # TopicMetadata object
                                partition_count = len(topic_info.partitions)
                                replication_factor = 1
                                if topic_info.partitions:
                                    replication_factor = len(topic_info.partitions[0].replicas)
                            elif isinstance(topic_info, dict) and 'partitions' in topic_info:
                                # Dict format
                                partition_count = len(topic_info['partitions'])
                                replication_factor = 1
                                if topic_info['partitions']:
                                    first_partition = topic_info['partitions'][0]
                                    if isinstance(first_partition, dict) and 'replicas' in first_partition:
                                        replication_factor = len(first_partition['replicas'])
                                    elif hasattr(first_partition, 'replicas'):
                                        replication_factor = len(first_partition.replicas)
                            else:
                                logger.warning(f"Unknown topic_info structure for {topic_name}: {type(topic_info)}")
                                partition_count = 1
                                replication_factor = 1
                            
                            logger.debug(f"Topic {topic_name}: {partition_count} partitions, {replication_factor} replicas")
                            
                            topics.append({
                                "name": topic_name,
                                "partitions": partition_count,
                                "replication_factor": replication_factor,
                                "is_internal": topic_name.startswith('_')
                            })
                        else:
                            logger.warning(f"Topic {topic_name} not found in describe_topics response")
                            # Fallback if topic not found in metadata
                            topics.append({
                                "name": topic_name,
                                "partitions": 1,
                                "replication_factor": 1,
                                "is_internal": topic_name.startswith('_')
                            })
                            
                    except Exception as topic_e:
                        logger.warning(f"Could not get metadata for topic {topic_name}: {str(topic_e)}")
                        topics.append({
                            "name": topic_name,
                            "partitions": 1,
                            "replication_factor": 1,
                            "is_internal": topic_name.startswith('_')
                        })
                        
            except Exception as metadata_e:
                logger.error(f"Could not get topic metadata via admin client: {str(metadata_e)}")
                # Final fallback: just return topic names with defaults
                for topic_name in topic_names:
                    topics.append({
                        "name": topic_name,
                        "partitions": 1,
                        "replication_factor": 1,
                        "is_internal": topic_name.startswith('_')
                    })
            
            logger.info(f"Returning {len(topics)} topics with metadata")
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
    
    def create_acl(self, principal: str, operation: str, resource_type: str, 
                   resource_name: str, host_pattern: str = "*") -> Dict[str, Any]:
        """
        Create an ACL using confluent_kafka
        
        Args:
            principal: The principal (e.g., "User:alice")
            operation: The operation (READ, WRITE, CREATE, DELETE, ALTER, DESCRIBE, ALL)
            resource_type: The resource type (TOPIC, GROUP, CLUSTER)
            resource_name: The resource name
            host_pattern: Host pattern (default: "*")
            
        Returns:
            Dictionary containing operation result
        """
        logger.info(f"Creating ACL: {principal} -> {operation} on {resource_type}:{resource_name}")
        logger.info(f"confluent_admin_client status: {self.confluent_admin_client is not None}")
        logger.info(f"confluent_admin_client type: {type(self.confluent_admin_client)}")
        
        # Use confluent_kafka if available, fallback to kafka-python
        if self.confluent_admin_client:
            logger.info("Using confluent_kafka for ACL creation")
            return self._create_acl_confluent(principal, operation, resource_type, resource_name, host_pattern)
        else:
            logger.warning("confluent_admin_client not available, falling back to kafka-python")
            return self._create_acl_old_implementation(principal, operation, resource_type, resource_name, host_pattern)
    
    def _create_acl_confluent(self, principal: str, operation: str, resource_type: str, 
                             resource_name: str, host_pattern: str = "*") -> Dict[str, Any]:
        """
        Create an ACL using confluent_kafka
        """
        try:
            # Map string operations to ConfluentAclOperation enum
            operation_map = {
                "READ": ConfluentAclOperation.READ,
                "WRITE": ConfluentAclOperation.WRITE,
                "CREATE": ConfluentAclOperation.CREATE,
                "DELETE": ConfluentAclOperation.DELETE,
                "ALTER": ConfluentAclOperation.ALTER,
                "DESCRIBE": ConfluentAclOperation.DESCRIBE,
                "CLUSTER_ACTION": ConfluentAclOperation.CLUSTER_ACTION,
                "ALL": ConfluentAclOperation.ALL
            }
            
            # Map string resource types to ConfluentResourceType enum
            resource_type_map = {
                "TOPIC": ConfluentResourceType.TOPIC,
                "GROUP": ConfluentResourceType.GROUP,
                "CLUSTER": ConfluentResourceType.CLUSTER,
                "TRANSACTIONAL_ID": ConfluentResourceType.TRANSACTIONAL_ID
            }
            
            if operation not in operation_map:
                return {"success": False, "error": f"Invalid operation: {operation}"}
            
            if resource_type not in resource_type_map:
                return {"success": False, "error": f"Invalid resource type: {resource_type}"}
            
            # Create ACL binding using confluent_kafka
            acl_binding = AclBinding(
                restype=resource_type_map[resource_type],
                name=resource_name,
                resource_pattern_type=ResourcePatternType.LITERAL,
                principal=principal,
                host=host_pattern,
                operation=operation_map[operation],
                permission_type=ConfluentAclPermissionType.ALLOW
            )
            
            logger.info(f"Creating ACL binding: {acl_binding}")
            
            # Create the ACL
            futures = self.confluent_admin_client.create_acls([acl_binding])
            
            # Wait for the result
            for acl_binding, future in futures.items():
                try:
                    future.result(timeout=10.0)  # Wait up to 10 seconds
                    logger.info(f"ACL created successfully: {principal} -> {operation} on {resource_type}:{resource_name}")
                    return {"success": True, "message": f"ACL created successfully for {principal}"}
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Error creating ACL: {error_msg}")
                    return {"success": False, "error": error_msg}
                    
        except KafkaException as e:
            logger.error(f"Kafka error creating ACL: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Error creating ACL: {e}")
            return {"success": False, "error": str(e)}
    
    def _create_acl_old_implementation(self, principal: str, operation: str, resource_type: str, 
                                      resource_name: str, host_pattern: str = "*") -> Dict[str, Any]:
        """
        Fallback to old kafka-python implementation for ACL creation
        """
        if not self.admin_client:
            return {"success": False, "error": "Admin client not initialized"}
        
        try:
            # Map string operations to ACLOperation enum
            operation_map = {
                "READ": ACLOperation.READ,
                "WRITE": ACLOperation.WRITE,
                "CREATE": ACLOperation.CREATE,
                "DELETE": ACLOperation.DELETE,
                "ALTER": ACLOperation.ALTER,
                "DESCRIBE": ACLOperation.DESCRIBE,
                "CLUSTER_ACTION": ACLOperation.CLUSTER_ACTION,
                "ALL": ACLOperation.ALL
            }
            
            # Map string resource types to ResourceType enum
            resource_type_map = {
                "TOPIC": ResourceType.TOPIC,
                "GROUP": ResourceType.GROUP,
                "CLUSTER": ResourceType.CLUSTER,
                "TRANSACTIONAL_ID": ResourceType.TRANSACTIONAL_ID
            }
            
            if operation not in operation_map:
                return {"success": False, "error": f"Invalid operation: {operation}"}
            
            if resource_type not in resource_type_map:
                return {"success": False, "error": f"Invalid resource type: {resource_type}"}
            
            # Create ACL object
            acl = ACL(
                principal=principal,
                host=host_pattern,
                operation=operation_map[operation],
                permission_type=ACLPermissionType.ALLOW,
                resource_pattern=ResourcePattern(resource_type_map[resource_type], resource_name)
            )
            
            # Create the ACL
            logger.info(f"Calling admin_client.create_acls with ACL: {acl}")
            futures = self.admin_client.create_acls([acl])
            logger.info(f"Raw ACL creation futures: {futures}")

            # kafka-python returns a dict of Future objects keyed by ACL
            if hasattr(futures, 'items'):
                for created_acl, future in futures.items():
                    try:
                        future.result(timeout=10.0)
                        logger.info(f"ACL created successfully: {principal} -> {operation} on {resource_type}:{resource_name}")
                        return {"success": True, "message": f"ACL created successfully for {principal}"}
                    except SecurityDisabledError as e:
                        logger.error(f"ACL authorization is not enabled on the Kafka cluster: {str(e)}")
                        return {"success": False, "error": "ACL authorization is not enabled on the Kafka cluster. Please enable the authorizer to use ACLs."}
                    except UnknownError as e:
                        logger.error(f"Unknown error creating ACL (likely ACL authorization not enabled): {str(e)}")
                        return {"success": False, "error": "ACL creation failed. This usually means ACL authorization is not enabled on the Kafka cluster."}
                    except Exception as e:
                        logger.error(f"Error creating ACL: {str(e)}")
                        return {"success": False, "error": str(e)}

            logger.error("admin_client.create_acls did not return futures; ACL creation not supported by this client")
            return {"success": False, "error": "ACL creation not supported by current admin client. Use confluent-kafka AdminClient."}
                    
        except SecurityDisabledError as e:
            logger.error(f"ACL authorization is not enabled on the Kafka cluster: {str(e)}")
            return {"success": False, "error": "ACL authorization is not enabled on the Kafka cluster. Please enable ACL authorization in the Kafka broker configuration."}
        except UnknownError as e:
            logger.error(f"Unknown error creating ACL (likely ACL authorization not enabled): {str(e)}")
            return {"success": False, "error": "ACL creation failed. This usually means ACL authorization is not enabled on the Kafka cluster."}
        except Exception as e:
            logger.error(f"Error creating ACL: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_acls(self) -> Dict[str, Any]:
        """
        Get all ACLs from Kafka cluster using confluent_kafka
        """
        logger.info("=== Starting get_acls method ===")
        # Prefer confluent-kafka if available; otherwise, fall back to kafka-python
        if self.confluent_admin_client:
            try:
                logger.info("Using confluent_kafka implementation")
                all_acls = []

                # Create a filter that matches ALL ACLs
                acl_filter = AclBindingFilter(
                    ConfluentResourceType.ANY,
                    None,
                    ResourcePatternType.ANY,
                    None,
                    None,
                    ConfluentAclOperation.ANY,
                    ConfluentAclPermissionType.ANY,
                )

                future = self.confluent_admin_client.describe_acls(acl_filter)
                acl_bindings = future.result(timeout=10)

                for acl in acl_bindings:
                    principal = acl.principal or ""
                    resource_type = (
                        acl.restype.name if hasattr(acl, "restype") else getattr(acl, "resource_pattern", None) and getattr(acl.resource_pattern, "resource_type", None).name
                    ) or ""
                    resource_name = (
                        acl.name if hasattr(acl, "name") else getattr(getattr(acl, "resource_pattern", None), "name", None)
                    ) or ""
                    operation = acl.operation.name if hasattr(acl, "operation") else ""
                    permission_name = acl.permission_type.name if hasattr(acl, "permission_type") else ""
                    # Normalize permission to match UI expectations ('Allow'/'Deny')
                    permission = "Allow" if permission_name.upper() == "ALLOW" else ("Deny" if permission_name.upper() == "DENY" else permission_name)

                    acl_dict = {
                        "id": f"{principal}|{resource_type}|{resource_name}|{operation}|{permission}",
                        "principal": principal or "N/A",
                        "host": acl.host or "",
                        "operation": operation or "N/A",
                        "permission": permission or "N/A",
                        "resource_type": resource_type or "N/A",
                        "resource_name": resource_name or "N/A",
                        "pattern_type": acl.resource_pattern_type.name if hasattr(acl, "resource_pattern_type") else getattr(getattr(acl, "resource_pattern", None), "pattern_type", None) and getattr(getattr(acl, "resource_pattern", None), "pattern_type", None).name or "",
                    }
                    # Only include ACLs with essential fields
                    if acl_dict["principal"] != "N/A" and acl_dict["resource_type"] != "N/A" and acl_dict["resource_name"] != "N/A":
                        all_acls.append(acl_dict)

                logger.info(f"Retrieved {len(all_acls)} ACLs from Kafka cluster")
                return {"success": True, "acls": all_acls}

            except KafkaException as e:
                logger.error(f"Kafka error retrieving ACLs via confluent_kafka: {e}")
                return {"success": False, "error": str(e), "message": "Failed to retrieve ACLs. ACL authorizer may be disabled or unsupported on this cluster."}
            except Exception as e:
                logger.error(f"Error retrieving ACLs via confluent_kafka: {e}")
                return {"success": False, "error": str(e), "message": "Failed to retrieve ACLs due to an unexpected error."}

        logger.warning("Confluent admin client not initialized; ACL listing requires confluent-kafka AdminClient")
        return {"success": False, "error": "Admin client not initialized", "message": "ACL listing requires confluent-kafka AdminClient."}

    def _get_acls_old_implementation(self) -> Dict[str, Any]:
        """
        Fallback to old kafka-python implementation
        """
        logger.info("Using old kafka-python implementation")
        try:
            all_acls = []
            resource_types = [ResourceType.TOPIC, ResourceType.GROUP, ResourceType.CLUSTER, ResourceType.TRANSACTIONAL_ID]

            for resource_type in resource_types:
                try:
                    logger.info(f"Querying ACLs for resource type: {resource_type}")
                    
                    acl_filter = ACLFilter(
                        principal=None,
                        host=None,
                        operation=ACLOperation.ANY,
                        permission_type=ACLPermissionType.ANY,
                        resource_pattern=ResourcePattern(resource_type, None)
                    )

                    logger.info(f"ACL Filter created: {acl_filter}")
                    acls = self.admin_client.describe_acls(acl_filter)
                    logger.info(f"RAW ACL RESPONSE for {resource_type}: {acls}")
                    logger.info(f"ACL Response type: {type(acls)}")
                    logger.info(f"ACL Response length: {len(acls) if hasattr(acls, '__len__') else 'No length'}")
                    
                    if hasattr(acls, '__iter__'):
                        for i, acl in enumerate(acls):
                            logger.info(f"ACL {i}: {acl}")
                            logger.info(f"ACL {i} type: {type(acl)}")
                            logger.info(f"ACL {i} attributes: {dir(acl)}")

                            try:
                                principal = getattr(acl, 'principal', '') or ''
                                resource_type = (
                                    getattr(getattr(acl, 'resource_pattern', None), 'resource_type', None)
                                )
                                resource_type_name = getattr(resource_type, 'name', str(resource_type)) if resource_type is not None else ''
                                resource_name = getattr(getattr(acl, 'resource_pattern', None), 'name', None) or ''
                                operation_obj = getattr(acl, 'operation', None)
                                operation_name = getattr(operation_obj, 'name', str(operation_obj)) if operation_obj is not None else ''
                                permission_obj = getattr(acl, 'permission_type', None)
                                permission_name = getattr(permission_obj, 'name', str(permission_obj)) if permission_obj is not None else ''
                                # Normalize permission to 'Allow'/'Deny'
                                permission = "Allow" if str(permission_name).upper() == "ALLOW" else ("Deny" if str(permission_name).upper() == "DENY" else str(permission_name))

                                acl_dict = {
                                    "id": f"{principal}|{resource_type_name}|{resource_name}|{operation_name}|{permission}",
                                    "principal": principal or "N/A",
                                    "host": getattr(acl, 'host', '') or '',
                                    "operation": operation_name or "N/A",
                                    "permission": permission or "N/A",
                                    "resource_type": resource_type_name or "N/A",
                                    "resource_name": resource_name or "N/A",
                                    "pattern_type": getattr(getattr(getattr(acl, 'resource_pattern', None), 'pattern_type', None), 'name', 'LITERAL'),
                                }
                                logger.info(f"Parsed ACL {i}: {acl_dict}")
                                if acl_dict["principal"] != "N/A" and acl_dict["resource_type"] != "N/A" and acl_dict["resource_name"] != "N/A":
                                    all_acls.append(acl_dict)
                            except Exception as parse_error:
                                logger.error(f"Error parsing ACL {i}: {parse_error}")
                                logger.error(f"ACL object: {acl}")
                    else:
                        logger.info(f"ACLs response is not iterable: {acls}")

                except Exception as e:
                    logger.error(f"Error retrieving ACLs for {resource_type}: {e}")
                    import traceback
                    logger.error(f"Full traceback: {traceback.format_exc()}")
                    continue

            logger.info(f"Retrieved {len(all_acls)} ACLs from Kafka cluster")
            return {"success": True, "acls": all_acls}

        except Exception as e:
            logger.error(f"Error retrieving ACLs: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {"success": False, "error": str(e)}

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