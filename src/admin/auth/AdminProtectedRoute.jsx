import {
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom';

import { useAdminAuth } from './useAdminAuth.js';

export function AdminProtectedRoute() {
    const location = useLocation();
    const { status } = useAdminAuth();

    if (status === 'checking') {
        return (
            <main className="admin-login">
                <p role="status">Проверяем доступ...</p>
            </main>
        );
    }

    if (status !== 'authenticated') {
        return (
            <Navigate
                to="/admin/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return <Outlet />;
}
