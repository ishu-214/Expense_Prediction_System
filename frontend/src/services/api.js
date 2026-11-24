import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Attach JWT access token from sessionStorage (clears on browser close)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => Promise.reject(error))

// Handle 401 unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
}

export const transactionsAPI = {
  list: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  get: (id) => api.get(`/transactions/${id}`),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  uploadCSV: (formData) => api.post('/transactions/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  correctCategory: (id, category_id) => api.post(`/transactions/${id}/correct-category`, null, {
    params: { category_id }
  }),
  categorizeText: (description, amount) => api.post('/transactions/categorize-preview', {
    description,
    amount
  })
}

export const categoriesAPI = {
  list: (params) => api.get('/categories', { params }),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

export const budgetsAPI = {
  list: (params) => api.get('/budgets', { params }),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
}

export const goalsAPI = {
  list: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
}

export const predictionsAPI = {
  getExpenses: () => api.get('/predictions/expenses'),
  getCategories: () => api.get('/predictions/categories'),
  getSavings: () => api.get('/predictions/savings'),
}

export const recommendationsAPI = {
  list: (params) => api.get('/recommendations', { params: typeof params === 'string' ? { status: params } : params }),
  generate: () => api.post('/recommendations/generate'),
  updateStatus: (id, status) => api.put(`/recommendations/${id}/status`, { status }),
  getWasteAnalysis: () => api.get('/recommendations/waste-analysis'),
}

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getMonthly: (year) => api.get('/analytics/monthly', { params: { year } }),
  getCategories: (params) => api.get('/analytics/categories', { params }),
  getReports: (period = 'monthly') =>
    api.get('/analytics/reports', {
      params: typeof period === 'object' ? period : { period }
    }),
  exportCSV: () => api.get('/analytics/export/csv', { responseType: 'blob' }),
  exportPDF: () => api.get('/analytics/export/pdf', { responseType: 'blob' }),
  getExportCSVUrl: () => `${API_BASE_URL}/analytics/export/csv`,
  getExportPDFUrl: () => `${API_BASE_URL}/analytics/export/pdf`,
}

export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAnalytics: () => api.get('/admin/analytics'),
  getUsageStats: () => api.get('/admin/usage-stats'),
  getModelPerformance: () => api.get('/admin/model-performance'),
  retrainModels: () => api.post('/admin/retrain-models'),
  getActivities: (params) => api.get('/admin/activities', { params }),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  getIssues: (params) => api.get('/admin/issues', { params }),
  createIssue: (data) => api.post('/admin/issues', data),
  updateIssue: (id, data) => api.put(`/admin/issues/${id}`, data),
  deleteIssue: (id) => api.delete(`/admin/issues/${id}`),
}

export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: (onlyRead = false) => api.delete(`/notifications/clear-all?only_read=${onlyRead}`),
}

export const demoAPI = {
  seed: () => api.post('/demo/seed'),
}

export default api
