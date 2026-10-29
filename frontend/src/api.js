import axios from 'axios';

export const TOKEN_KEY = 'vs_token';
export const SHOPKEEPER_KEY = 'vs_shopkeeper';

const api = axios.create({
    baseURL: process.env.REACT_APP_BASE_URL
});

// Attach the shopkeeper's JWT to every request.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If the server says the session is invalid or expired, log out locally.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthCall = (error.config?.url || '').startsWith('/auth/');
        if (error.response?.status === 401 && !isAuthCall) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(SHOPKEEPER_KEY);
            if (window.location.pathname !== '/login') {
                window.location.assign('/login');
            }
        }
        return Promise.reject(error);
    }
);

// Turn an axios error into a message that can be shown to the user.
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
    return error?.response?.data?.message || fallback;
}

export default api;
