import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const tariffsApi = {
    getSettings() {
        return adminApiRequest(API.adminTariffs);
    },

    saveDraft(body) {
        return adminApiRequest(`${API.adminTariffs}/draft`, {
            method: 'PUT',
            body,
        });
    },

    publish() {
        return adminApiRequest(`${API.adminTariffs}/publish`, {
            method: 'POST',
        });
    },
};
