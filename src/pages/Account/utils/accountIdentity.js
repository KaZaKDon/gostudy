function normalizeText(value) {
    return typeof value === 'string'
        ? value.trim()
        : '';
}

function splitFullName(fullName) {
    const parts = normalizeText(fullName)
        .split(/\s+/)
        .filter(Boolean);

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
}

function getInitials(firstName, lastName, displayName) {
    const initials = [firstName, lastName]
        .map((part) => normalizeText(part).charAt(0))
        .filter(Boolean)
        .join('')
        .toUpperCase();

    if (initials) {
        return initials;
    }

    return normalizeText(displayName)
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase();
}

export function createAccountIdentity({
    user,
    profile,
}) {
    const fallbackName = splitFullName(user?.full_name);

    const firstName =
        normalizeText(profile?.first_name) ||
        fallbackName.firstName;

    const lastName =
        normalizeText(profile?.last_name) ||
        fallbackName.lastName;

    const displayName =
        normalizeText(`${firstName} ${lastName}`) ||
        normalizeText(user?.full_name) ||
        normalizeText(user?.email) ||
        'Пользователь';

    return {
        firstName,
        lastName,
        displayName,
        initials: getInitials(
            firstName,
            lastName,
            displayName,
        ),
        avatarUrl:
            normalizeText(profile?.photo_url) ||
            normalizeText(user?.avatar_url) ||
            null,
    };
}