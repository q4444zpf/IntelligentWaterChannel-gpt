import { baseURL, http } from '../utils/request.js';

export function getCode() {
  return http.get('/valid/code');
}

export function getCaptchaUrl(code) {
  const params = new URLSearchParams({ code, _: Date.now().toString() });
  return `${baseURL}/valid/captcha?${params}`;
}

export function login(credentials) {
  const code = encodeURIComponent(credentials.code);
  return http.post(`/core/login?code=${code}`, credentials, { rawResponse: true });
}

export function getCurrentUser() {
  return http.get('/core/admin/detail');
}

export function getPermissions() {
  return http.get('/core/menu/permissions');
}

export function logout() {
  return http.post('/core/logout');
}
