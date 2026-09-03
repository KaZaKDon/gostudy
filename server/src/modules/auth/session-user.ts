import type {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';

export type SessionUser = {
    id: number;
    role: UserRole;
    email: string;
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    profileCompleted: boolean;
};

export function toPublicUser(
    user: SessionUser,
): Record<string, unknown> {
    return {
        id: user.id,
        role: user.role.toLowerCase(),
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        avatar_url: user.avatarUrl,
        status: user.status.toLowerCase(),
        email_verified: Boolean(user.emailVerifiedAt),
        profile_completed: user.profileCompleted,
    };
}
