const API = import.meta.env.VITE_API_URL || 'http://35.153.204.139:3000';

export const getToken  = ()  => localStorage.getItem('borjax_token');
export const setToken  = (t) => localStorage.setItem('borjax_token', t);
export const removeToken = () => localStorage.removeItem('borjax_token');
export const isLoggedIn  = () => !!getToken();
export const getUser = () => { try { return JSON.parse(localStorage.getItem('borjax_user')); } catch { return null; } };
export const setUser = (u) => localStorage.setItem('borjax_user', JSON.stringify(u));
export const logout  = () => { removeToken(); localStorage.removeItem('borjax_user'); };

// No-op — kept for compat with import { initAuth }
export function initAuth() {}

export { API };
