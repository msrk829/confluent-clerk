/**
 * API Service
 * Utility functions for making authenticated API requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Request-related API functions
export const requestApi = {
  /**
   * Create a topic request
   */
  createTopicRequest: (requestData: {
    request_type: 'TOPIC';
    details: any;
    rationale: string;
  }) => apiRequest('/api/user/requests/topic', {
    method: 'POST',
    body: requestData,
  }),

  /**
   * Create an ACL request
   */
  createACLRequest: (requestData: {
    request_type: 'ACL';
    details: any;
    rationale: string;
  }) => apiRequest('/api/user/requests/acl', {
    method: 'POST',
    body: requestData,
  }),

  /**
   * Get all user requests
   */
  getUserRequests: () => apiRequest('/api/user/requests/'),

  /**
   * Get a specific request by ID
   */
  getRequestById: (requestId: string) => apiRequest(`/api/user/requests/${requestId}`),

  /**
   * Get all requests (admin only)
   */
  getAllRequests: () => apiRequest('/api/admin/requests'),

  /**
   * Get pending requests (admin only)
   */
  getPendingRequests: () => apiRequest('/api/admin/requests/pending'),

  /**
   * Approve a request (admin only)
   */
  approveRequest: (requestId: string) => apiRequest(`/api/admin/requests/${requestId}/approve`, {
    method: 'PATCH',
  }),

  /**
   * Reject a request (admin only)
   */
  rejectRequest: (requestId: string, rejectionReason: string) => apiRequest(`/api/admin/requests/${requestId}/reject`, {
    method: 'PATCH',
    body: { rejection_reason: rejectionReason },
  }),
};

// Kafka-related API functions
export const kafkaApi = {
  /**
   * Get all Kafka topics
   */
  getTopics: () => apiRequest('/api/kafka/topics'),

  /**
   * Get Kafka cluster information
   */
  getClusterInfo: () => apiRequest('/api/kafka/cluster/info'),

  /**
   * Test Kafka cluster connection
   */
  testConnection: () => apiRequest('/api/kafka/cluster/test'),

  /**
   * Get all ACLs
   */
  getACLs: () => apiRequest('/api/kafka/acls'),

  /**
   * Create a new topic (admin only)
   */
  createTopic: (topicData: {
    name: string;
    partitions: number;
    replication_factor: number;
    config?: Record<string, string>;
  }) => apiRequest('/api/kafka/topics', {
    method: 'POST',
    body: topicData,
  }),

  /**
   * Delete a topic (admin only)
   */
  deleteTopic: (topicName: string) => apiRequest(`/api/kafka/topics/${topicName}`, {
    method: 'DELETE',
  }),

  /**
   * Get topic configuration
   */
  getTopicConfig: (topicName: string) => apiRequest(`/api/kafka/topics/${topicName}/config`),
};

export default apiRequest;