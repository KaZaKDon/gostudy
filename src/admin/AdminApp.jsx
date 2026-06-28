import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import { AdminLayout } from './layout/AdminLayout.jsx';
import { AccountsPage } from './pages/Accounts/AccountsPage.jsx';
import { AdminDashboardPage } from './pages/Dashboard/AdminDashboardPage.jsx';
import { AdminLoginPage } from './pages/Login/AdminLoginPage.jsx';

export function AdminApp() {
    return (
        <Routes>
            <Route path="login" element={<AdminLoginPage />} />

            <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="accounts" element={<AccountsPage />} />
            </Route>
        </Routes>
    );
}