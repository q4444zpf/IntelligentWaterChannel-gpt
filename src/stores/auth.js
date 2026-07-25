import { readonly, ref } from 'vue';
import {
  getCurrentUser,
  getPermissions,
  login as loginRequest,
  logout as logoutRequest,
} from '../api/auth.js';
import { ACCESS_TOKEN_KEY, SUCCESS_CODE } from '../constants/auth.js';
import {
  getToken,
  removeToken,
  setCompatibleSystemStore,
  setToken,
} from '../utils/auth.js';
import { ApiError } from '../utils/request.js';

const user = ref(null);
const permissions = ref([]);
const initialized = ref(false);
let authContextRequest = null;

export const authState = {
  user: readonly(user),
  permissions: readonly(permissions),
  initialized: readonly(initialized),
};

function requireSuccess(response, fallbackMessage) {
  if (response?.code !== SUCCESS_CODE) {
    throw new ApiError(response?.message || fallbackMessage, response?.code);
  }
  return response.data;
}

export async function authenticate(credentials) {
  const response = await loginRequest(credentials);
  requireSuccess(response.data, '登录失败');

  const token = response.headers[ACCESS_TOKEN_KEY] || getToken();
  if (!token) {
    throw new ApiError('登录成功，但响应中未返回访问令牌');
  }

  setToken(token);
  setCompatibleSystemStore(token);
  initialized.value = false;

  try {
    await initializeAuth(true);
  } catch (error) {
    clearAuth();
    throw error;
  }
}

export async function initializeAuth(force = false) {
  if (!getToken()) {
    clearAuth();
    return null;
  }

  if (!force && initialized.value) {
    return user.value;
  }

  if (!authContextRequest) {
    authContextRequest = Promise.all([getCurrentUser(), getPermissions()])
      .then(([userResponse, permissionResponse]) => {
        user.value = requireSuccess(userResponse, '获取用户信息失败');
        const permissionData = requireSuccess(permissionResponse, '获取用户权限失败');
        permissions.value = Array.isArray(permissionData) ? permissionData : [];
        initialized.value = true;
        return user.value;
      })
      .finally(() => {
        authContextRequest = null;
      });
  }

  return authContextRequest;
}

export function hasPermission(permission) {
  return permissions.value.includes(permission);
}

export function clearAuth() {
  removeToken();
  user.value = null;
  permissions.value = [];
  initialized.value = false;
  authContextRequest = null;
}

export async function signOut() {
  try {
    if (getToken()) {
      const response = await logoutRequest();
      requireSuccess(response, '退出登录失败');
    }
  } finally {
    clearAuth();
  }
}
