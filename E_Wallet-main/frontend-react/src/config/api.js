export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
export const API_GATEWAY_BASE_URL = API_BASE_URL;
export const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;
export const USER_API_BASE_URL = `${API_BASE_URL}/user`;
export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
