import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export function loginAdmin(credentials) {
    return adminApiRequest(API.adminLogin, {
        method: 'POST',
        body: credentials,
        token: '',
    });
}

export function getAdminSession() {
    return adminApiRequest(API.adminMe);
}

export function logoutAdmin() {
    return adminApiRequest(API.adminLogout, {
        method: 'POST',
    });
}
