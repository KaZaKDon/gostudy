const API_BASE = import.meta.env.DEV
    ? 'https://gostudyonline.ru/api'
    : '/api';

export const API = {
    login: `${API_BASE}/auth/login.php`,
    register: `${API_BASE}/auth/register.php`,
    verifyEmail: `${API_BASE}/auth/verify-email.php`,
    resendVerification: `${API_BASE}/auth/resend-verification.php`,
    forgotPassword: `${API_BASE}/auth/forgot-password.php`,
    resetPassword: `${API_BASE}/auth/reset-password.php`,
};