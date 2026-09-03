import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export function getAdminDashboardStats() {
    return adminApiRequest(API.adminDashboardStats);
}
