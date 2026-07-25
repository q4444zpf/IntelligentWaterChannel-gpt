import {
  ACCESS_TOKEN_KEY,
  SYSTEM_STORE_KEY,
  USER_INFO_KEY,
} from '../constants/auth.js';

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(SYSTEM_STORE_KEY);
}

export function setCompatibleSystemStore(token) {
  const systemStore = {
    [USER_INFO_KEY]: {
      userToken: token,
      tokenName: ACCESS_TOKEN_KEY,
    },
  };

  localStorage.setItem(SYSTEM_STORE_KEY, JSON.stringify(systemStore));
}

