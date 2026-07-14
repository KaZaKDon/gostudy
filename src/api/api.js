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

    me: `${API_BASE}/profile/me.php`,
    updateTeacher: `${API_BASE}/profile/update-teacher.php`,
    updateStudent: `${API_BASE}/profile/update-student.php`,
    studentProfile: `${API_BASE}/profile/student.php`,
    studentSchedule: `${API_BASE}/student/schedule.php`,
    studentHomework: `${API_BASE}/student/homework.php`,
    studentDiary: `${API_BASE}/student/diary.php`,
    studentTeachers: `${API_BASE}/student/teachers.php`,
    findTeachers: `${API_BASE}/student/find-teachers.php`,
};

export function getAuthHeaders()
{
    const token = sessionStorage.getItem('gostudy_token');

    return token
        ? {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
        }
        : {
            'Content-Type': 'application/json',
        };
}