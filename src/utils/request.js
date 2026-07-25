import axios from 'axios';
import { ACCESS_TOKEN_KEY } from '../constants/auth.js';
import { getToken } from './auth.js';

export const baseURL = import.meta.env.VITE_APP_BASE_API || '/api';

let unauthorizedHandler = () => {};

export class ApiError extends Error {
  constructor(message, code = null, cause = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.cause = cause;
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function handleUnauthorized() {
  unauthorizedHandler();
  return Promise.reject(new ApiError('登录状态已失效，请重新登录', 401));
}

export const http = axios.create({
  baseURL,
  timeout: 300000,
  headers: {
    'x-requested-with': 'XMLHttpRequest',
    'Content-Type': 'application/json; charset=UTF-8',
  },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers[ACCESS_TOKEN_KEY] = token;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    if (response.data?.code === 401) {
      return handleUnauthorized();
    }

    return response.config.rawResponse ? response : response.data;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      return handleUnauthorized();
    }

    if (status === 404) {
      return Promise.reject(new ApiError('请求的接口不存在', 404, error));
    }

    let message = error.response?.data?.message || error.message || '后端接口异常';
    if (message === 'Network Error') {
      message = '网络连接异常';
    } else if (message.includes('timeout')) {
      message = '接口请求超时';
    }

    return Promise.reject(new ApiError(message, status, error));
  },
);

