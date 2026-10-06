import { API, getAuthToken } from '../api/api.js';
import { apiRequest } from '../api/apiRequest.js';

const USER_SESSION_KEYS = Object.freeze([
    'gostudy_token',
    'gostudy_user',
]);

export function clearUserSession() {
    for (const key of USER_SESSION_KEYS) {
        sessionStorage.removeItem(key);
    }
}

export async function logoutUser() {
    try {
        if (getAuthToken()) {
            await apiRequest(API.logout, {
                method: 'POST',
            });
        }
    } finally {
        clearUserSession();
    }
}
