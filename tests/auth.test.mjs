import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCESS_TOKEN_KEY,
  SYSTEM_STORE_KEY,
  USER_INFO_KEY,
} from '../src/constants/auth.js';
import {
  getToken,
  removeToken,
  setCompatibleSystemStore,
  setToken,
} from '../src/utils/auth.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('stores the access token and iotview-compatible user info', () => {
  globalThis.localStorage = createStorage();

  setToken('token-value');
  setCompatibleSystemStore('token-value');

  assert.equal(getToken(), 'token-value');
  assert.deepEqual(JSON.parse(localStorage.getItem(SYSTEM_STORE_KEY)), {
    [USER_INFO_KEY]: {
      userToken: 'token-value',
      tokenName: ACCESS_TOKEN_KEY,
    },
  });

  removeToken();
  assert.equal(getToken(), null);
  assert.equal(localStorage.getItem(SYSTEM_STORE_KEY), null);
});
