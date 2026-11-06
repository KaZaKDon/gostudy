import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export function getAdminSubscriptions(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) params.set(key, value);
    });
    return adminApiRequest(`${API.adminSubscriptions}?${params}`);
}
