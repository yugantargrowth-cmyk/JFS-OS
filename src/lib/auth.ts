const SESSION_KEY = 'jfs_authed';
export const APP_PASSWORD = '1234';

export function isAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === 'yes';
}
export function tryLogin(password: string) {
  const ok = password === APP_PASSWORD;
  if (ok) sessionStorage.setItem(SESSION_KEY, 'yes');
  return ok;
}
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
