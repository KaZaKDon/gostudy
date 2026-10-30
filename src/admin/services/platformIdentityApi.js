import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';
export const platformIdentityApi = {
    read: () => adminApiRequest(API.adminPlatformIdentity),
    save: (body) => adminApiRequest(API.adminPlatformIdentity, { method: 'PUT', body }),
};
