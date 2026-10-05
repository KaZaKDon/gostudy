import {
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

export function useNotificationCapabilities() {
    const [capabilities, setCapabilities] = useState(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const controller = new AbortController();

        apiRequest(API.notificationCapabilities, {
            signal: controller.signal,
        }).then((result) => {
            setCapabilities(result.capabilities || null);
            setStatus('success');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                setCapabilities(null);
                setStatus('error');
            }
        });

        return () => controller.abort();
    }, []);

    return { capabilities, status };
}
