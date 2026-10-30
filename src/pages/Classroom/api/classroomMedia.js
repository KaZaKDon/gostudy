import { API } from '../../../api/api.js';
import { apiRequest } from '../../../api/apiRequest.js';

export async function loadClassroomIceServers(lessonId, signal) {
    const result = await apiRequest(
        API.classroomMediaConfig + '?lesson_id=' + encodeURIComponent(lessonId),
        { signal },
    );

    if (!Array.isArray(result.ice_servers) || !result.ice_servers.length) {
        throw new Error('Видеосвязь временно недоступна');
    }

    return result.ice_servers;
}
