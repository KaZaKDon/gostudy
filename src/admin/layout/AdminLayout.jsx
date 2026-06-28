import { Outlet } from 'react-router-dom';

import { AdminHeader } from '../components/layout/AdminHeader.jsx';
import { AdminSidebar } from '../components/layout/AdminSidebar.jsx';

import '../styles/admin.css';

export function AdminLayout() {
    return (
        <div className="admin-shell">
            <AdminSidebar />

            <div className="admin-main">
                <AdminHeader />

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}