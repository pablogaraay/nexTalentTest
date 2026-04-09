import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Jobs
export const jobsAPI = {
  search: (formData) => api.post('/jobs/search', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Offers
export const offersAPI = {
  compare: (offerIds) => api.post('/offers/compare', { offer_ids: offerIds }),
};

// Skills
export const skillsAPI = {
  getDemand: () => api.get('/skills/demand'),
  analyzeGap: (data) => api.post('/skills/gap', data),
  getRoles: () => api.get('/skills/gap/roles'),
};

// Trends
export const trendsAPI = {
  getRoles: () => api.get('/trends/roles'),
};

// Companies
export const companiesAPI = {
  compare: () => api.get('/companies/compare'),
};

export default api;
