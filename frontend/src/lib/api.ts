import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const message =
      error.response?.data?.message ||
      (error.response?.status === 401
        ? 'Session expired. Please log in again.'
        : error.response?.status === 403
        ? 'Access forbidden. You do not have permission for this resource.'
        : error.message || 'An unexpected error occurred');

    return Promise.reject(new Error(message));
  }
);
