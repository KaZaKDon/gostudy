export const USER_ROLES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
};

export const ROLE_ROUTES = {
    [USER_ROLES.STUDENT]: '/account',
    [USER_ROLES.TEACHER]: '/account',
    [USER_ROLES.ADMIN]: '/admin/login',
    [USER_ROLES.MODERATOR]: '/admin/login',
};

export function isProfileRole(role) {
    return role === USER_ROLES.STUDENT || role === USER_ROLES.TEACHER;
}

export function isAdminRole(role) {
    return role === USER_ROLES.ADMIN || role === USER_ROLES.MODERATOR;
}

export function getRouteAfterLogin(user) {
    if (!user || !user.role) {
        return '/login';
    }

    if (isAdminRole(user.role)) {
        return ROLE_ROUTES[user.role];
    }

    if (isProfileRole(user.role) && !user.profile_completed) {
        return `/profile-start?role=${user.role}`;
    }

    if (isProfileRole(user.role)) {
        return ROLE_ROUTES[user.role];
    }

    return '/login';
}