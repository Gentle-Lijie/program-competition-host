const KEY = 'pch_admin_token';

export function getToken(): string {
  return localStorage.getItem(KEY) ?? '';
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}
