/**
 * API Client for GlyphHash
 * ========================
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data as T;
  }

  // ===========================================
  // Topics
  // ===========================================

  async createTopic(params: {
    name: string;
    description?: string;
    companyIdentifier: string;
  }) {
    return this.request<{
      topic: {
        id: string;
        topicId: string;
        name: string;
        bindingHash: string;
      };
      transactionId: string;
      consensusTimestamp?: string;
    }>('/api/v1/topics', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listTopics() {
    return this.request<Array<{
      id: string;
      topicId: string;
      name: string;
      description?: string;
      companyIdentifier: string;
      bindingHash: string;
      createdAt: string;
      _count?: {
        documents: number;
      };
    }>>('/api/v1/topics');
  }

  async getTopics() {
    return this.listTopics();
  }

  async getTopic(id: string) {
    return this.request<{
      id: string;
      topicId: string;
      name: string;
      description?: string;
      companyIdentifier: string;
      bindingHash: string;
    }>(`/api/v1/topics/${id}`);
  }

  async updateTopic(id: string, params: { name?: string; description?: string }) {
    return this.request<{
      id: string;
      name: string;
      description?: string;
    }>(`/api/v1/topics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  async deleteTopic(id: string) {
    return this.request<{ deleted: boolean }>(`/api/v1/topics/${id}`, {
      method: 'DELETE',
    });
  }

  async getTopicMessages(id: string, limit = 100) {
    return this.request<Array<{
      consensusTimestamp: string;
      sequenceNumber: number;
      message: string;
    }>>(`/api/v1/topics/${id}/messages?limit=${limit}`);
  }

  // ===========================================
  // Documents
  // ===========================================

  async uploadDocument(params: {
    file: File;
    topicId: string;
    category: string;
    description?: string;
  }) {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('metadata', JSON.stringify({
      topicId: params.topicId,
      category: params.category,
      description: params.description,
    }));

    const response = await fetch(`${this.baseUrl}/api/v1/documents`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data.data as {
      document: {
        id: string;
        filename: string;
        originalName: string;
        hash: string;
        status: string;
        sequenceNumber?: number;
      };
      transactionId: string;
    };
  }

  async listDocuments(params?: { topicId?: string; category?: string; status?: string }) {
    const filteredParams = Object.fromEntries(
      Object.entries(params || {}).filter(([_, v]) => v !== '' && v !== undefined)
    );
    const query = new URLSearchParams(filteredParams as any).toString();
    return this.request<Array<{
      id: string;
      filename: string;
      originalName: string;
      hash: string;
      status: string;
      category: string;
      size: number;
      mimeType: string;
      sequenceNumber?: number;
      transactionId?: string;
      consensusTimestamp?: string;
      createdAt: string;
      topic: {
        id: string;
        name: string;
        topicId: string;
      };
    }>>(`/api/v1/documents${query ? `?${query}` : ''}`);
  }

  async getDocuments(params?: { topicId?: string; category?: string }) {
    return this.listDocuments(params);
  }

  async getDocument(id: string) {
    return this.request<{
      id: string;
      filename: string;
      originalName: string;
      hash: string;
      status: string;
      category: string;
      description?: string;
      sequenceNumber?: number;
      consensusTimestamp?: string;
      transactionId?: string;
    }>(`/api/v1/documents/${id}`);
  }

  async deleteDocument(id: string) {
    return this.request<{ deleted: boolean }>(`/api/v1/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // ===========================================
  // Dashboard Stats
  // ===========================================

  async getDashboardStats() {
    return this.request<{
      totalTopics: number;
      totalDocuments: number;
      verifiedDocuments: number;
      pendingDocuments: number;
      recentDocuments: Array<{
        id: string;
        originalName: string;
        status: string;
        createdAt: string;
      }>;
      recentTopics: Array<{
        id: string;
        name: string;
        topicId: string;
        documentCount: number;
      }>;
    }>('/api/v1/dashboard/stats');
  }

  // ===========================================
  // Verification
  // ===========================================

  async verifyDocument(documentId: string) {
    return this.request<{
      documentId: string;
      filename: string;
      status: 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'ERROR';
      storedHash: string;
      computedHash?: string;
      hederaHash?: string;
      consensusTimestamp?: string;
      details?: string;
    }>('/api/v1/verification/document', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    });
  }

  async verifyBatch(params: {
    topicId: string;
    startDate?: string;
    endDate?: string;
    categories?: string[];
  }) {
    return this.request<{
      id: string;
      topicId: string;
      totalDocuments: number;
      verified: number;
      mismatches: number;
      notFound: number;
      errors: number;
      results: Array<{
        documentId: string;
        filename: string;
        status: string;
        details?: string;
      }>;
    }>('/api/v1/verification/batch', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

export const api = new ApiClient(API_BASE);
export default api;
