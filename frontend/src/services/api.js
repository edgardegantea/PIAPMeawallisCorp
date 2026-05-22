import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('auth-storage');
  if (authData) {
    try {
      const { state } = JSON.parse(authData);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/token/refresh`, { refresh: refreshToken });
        // Actualizar ambos tokens: access (en Zustand) y refresh (en localStorage)
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
        }
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.state.token = data.access;
          localStorage.setItem('auth-storage', JSON.stringify(parsed));
        }
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  register:      (d)    => api.post('/auth/register', d),
  login:         (d)    => api.post('/auth/login', d),
  logout:        ()     => api.post('/auth/logout'),
  getProfile:    ()     => api.get('/auth/profile'),
  updateProfile: (d)    => api.patch('/auth/profile/update', d),
  refresh:       (tok)  => api.post('/auth/token/refresh', { refresh: tok }),
};
