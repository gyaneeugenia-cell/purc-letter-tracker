import axios from 'axios';

// In dev the API runs on a separate port; in production the server serves the
// built client on the same origin, so a relative "/api" works on any host.
const baseURL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');

export const http = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('purc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);
