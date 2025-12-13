import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use(async (config) => {
  // In a real app, get Clerk token here
  // const token = await getToken();
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

export const api = {
  // Tenants
  createTenant: (data: {
    name: string;
    slug: string;
    clerkOrgId: string;
  }) => apiClient.post('/tenants', data),
  
  getTenant: (id: string) => apiClient.get(`/tenants/${id}`),
  
  listTenants: (page?: number, limit?: number) =>
    apiClient.get('/tenants', { params: { page, limit } }),

  // Compliance Logs
  createLog: (data: any) => apiClient.post('/compliance-logs', data),
  
  listLogs: (params?: any) =>
    apiClient.get('/compliance-logs', { params }),
  
  submitToHCS: (id: string) =>
    apiClient.post(`/compliance-logs/${id}/submit`),
  
  getEvidenceUploadUrl: (id: string, fileName: string, contentType: string) =>
    apiClient.get(`/compliance-logs/${id}/evidence-upload-url`, {
      params: { fileName, contentType },
    }),
  
  updateEvidence: (id: string, data: any) =>
    apiClient.patch(`/compliance-logs/${id}/evidence`, data),
  
  getDashboardStats: () =>
    apiClient.get('/compliance-logs/dashboard/stats'),
};

export default apiClient;
