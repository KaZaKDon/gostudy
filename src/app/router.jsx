import { Suspense } from 'react';
import {
    createBrowserRouter,
    Outlet,
    RouterProvider,
} from 'react-router-dom';

import { SeoManager } from '../components/Seo/SeoManager.jsx';
import { lazyNamed } from '../utils/lazyNamed.js';

const Home = lazyNamed(
    () => import('../pages/Home/Home.jsx'),
    'Home'
);
const Login = lazyNamed(
    () => import('../pages/Login/Login.jsx'),
    'Login'
);
const Register = lazyNamed(
    () => import('../pages/Register/Register.jsx'),
    'Register'
);
const PasswordReset = lazyNamed(
    () => import('../pages/PasswordReset/PasswordReset.jsx'),
    'PasswordReset'
);
const ProfileStart = lazyNamed(
    () => import('../pages/ProfileStart/ProfileStart.jsx'),
    'ProfileStart'
);
const Account = lazyNamed(
    () => import('../pages/Account/Account.jsx'),
    'Account'
);
const ClassroomPage = lazyNamed(
    () => import('../pages/Classroom/ClassroomPage.jsx'),
    'ClassroomPage'
);
const LegalPage = lazyNamed(
    () => import('../data/legal/LegalPage.jsx'),
    'LegalPage'
);
const NotFoundPage = lazyNamed(
    () => import('../pages/NotFound/NotFoundPage.jsx'),
    'NotFoundPage'
);
const AdminApp = lazyNamed(
    () => import('../admin/AdminApp.jsx'),
    'AdminApp'
);
const VerifyEmail = lazyNamed(
    () => import('../pages/VerifyEmail/VerifyEmail.jsx'),
    'VerifyEmail'
);

function AppRouteLayout() {
    return (
        <>
            <SeoManager />

            <Suspense
                fallback={(
                    <div
                        className="app__route-loading"
                        role="status"
                    >
                        Загрузка…
                    </div>
                )}
            >
                <Outlet />
            </Suspense>
        </>
    );
}

const router = createBrowserRouter([
    {
        element: <AppRouteLayout />,
        children: [
            {
                path: '/',
                element: <Home />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/register',
                element: <Register />,
            },
            {
                path: '/password-reset',
                element: <PasswordReset />,
            },
            {
                path: '/profile-start',
                element: <ProfileStart />,
            },
            {
                path: '/account',
                element: <Account />,
            },
            {
                path: '/classroom/:lessonId',
                element: <ClassroomPage />,
            },
            {
                path: '/agreement',
                element: <LegalPage documentType="agreement" />,
            },
            {
                path: '/privacy',
                element: <LegalPage documentType="privacy" />,
            },
            {
                path: '/rules',
                element: <LegalPage documentType="rules" />,
            },
            {
                path: '/admin/*',
                element: <AdminApp />,
            },
            {
                path: '/verify-email',
                element: <VerifyEmail />,
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}
