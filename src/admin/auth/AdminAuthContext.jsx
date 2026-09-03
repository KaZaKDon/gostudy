import {
    useEffect,
    useState,
} from 'react';

import {
    getAdminSession,
    loginAdmin,
    logoutAdmin,
} from '../services/adminAuthApi.js';
import {
    clearAdminToken,
    getAdminToken,
    saveAdminToken,
} from '../services/adminSession.js';
import { AdminAuthContext } from './admin-auth-context.js';

export function AdminAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(
        getAdminToken() ? 'checking' : 'anonymous',
    );

    useEffect(() => {
        if (!getAdminToken()) {
            return undefined;
        }

        let isActive = true;

        getAdminSession()
            .then((result) => {
                if (isActive) {
                    setUser(result.data.user);
                    setStatus('authenticated');
                }
            })
            .catch(() => {
                clearAdminToken();

                if (isActive) {
                    setUser(null);
                    setStatus('anonymous');
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    async function login(credentials) {
        const result = await loginAdmin(credentials);

        saveAdminToken(result.token);
        setUser(result.user);
        setStatus('authenticated');

        return result.user;
    }

    async function logout() {
        try {
            if (getAdminToken()) {
                await logoutAdmin();
            }
        } finally {
            clearAdminToken();
            setUser(null);
            setStatus('anonymous');
        }
    }

    return (
        <AdminAuthContext.Provider
            value={{
                login,
                logout,
                status,
                user,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
}
