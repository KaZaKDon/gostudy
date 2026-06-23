import {
    createBrowserRouter,
    RouterProvider,
} from 'react-router-dom';

import { Home } from '../pages/Home/Home.jsx';
import { Login } from '../pages/Login/Login.jsx';
import { Register } from '../pages/Register/Register.jsx';
import { PasswordReset } from '../pages/PasswordReset/PasswordReset.jsx';
import { ProfileStart } from '../pages/ProfileStart/ProfileStart.jsx';
import { Account } from '../pages/Account/Account.jsx';

const router = createBrowserRouter([
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
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}