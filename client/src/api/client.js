import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const api = axios.create({
  baseURL: configuredBaseUrl ? `${configuredBaseUrl}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: add JWT Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('recruitx_token') || localStorage.getItem('talentiq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('recruitx_token');
      localStorage.removeItem('recruitx_user');
      localStorage.removeItem('talentiq_token');
      localStorage.removeItem('talentiq_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getTopCandidates: () => api.get('/dashboard/top-candidates')
};

export const resumesApi = {
  getResumes: () => api.get('/resumes'),
  getResumeById: (id) => api.get(`/resumes/${id}`),
  uploadResumes: (formData) => api.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteResume: (id) => api.delete(`/resumes/${id}`)
};

export const candidatesApi = {
  getCandidates: (params) => api.get('/candidates', { params }),
  getShortlist: (params) => api.get('/candidates/shortlist', { params }),
  getCandidateById: (id) => api.get(`/candidates/${id}`),
  getTalentDNA: (id) => api.get(`/candidates/${id}/talent-dna`),
  search: (query, limit = 6) => api.post('/candidates/search', { query, limit }),
  toggleShortlist: (id) => api.post(`/candidates/${id}/shortlist`),
  compare: (candidate_ids) => api.post('/candidates/compare', { candidate_ids })
};

export const notificationsApi = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/all/read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications/all')
};

export const copilotApi = {
  getConversations: () => api.get('/copilot/conversations'),
  getConversationById: (id) => api.get(`/copilot/conversations/${id}`),
  sendMessage: (message, conversation_id) => api.post('/copilot/chat', { message, conversation_id }),
  deleteConversation: (id) => api.delete(`/copilot/conversations/${id}`)
};

export const interviewApi = {
  generate: (data) => api.post('/interviews/generate', data),
  getInterviews: () => api.get('/interviews'),
  getInterviewById: (id) => api.get(`/interviews/${id}`),
  update: (id, questions) => api.put(`/interviews/${id}`, { questions }),
  delete: (id) => api.delete(`/interviews/${id}`),
  getPdfUrl: (id) => {
    const token = localStorage.getItem('recruitx_token') || localStorage.getItem('talentiq_token');
    return `/api/interviews/${id}/pdf${token ? `?token=${token}` : ''}`;
  }
};

export default api;
