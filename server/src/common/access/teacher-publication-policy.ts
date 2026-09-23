import type { Prisma } from '../../generated/prisma/client';
import {
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';

export function activeTeacherAccountWhere(
    additionalWhere: Prisma.UserWhereInput = {},
): Prisma.UserWhereInput {
    return {
        ...additionalWhere,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
    };
}

export function publicTeacherProfileWhere(
    additionalUserWhere: Prisma.UserWhereInput = {},
): Prisma.TeacherProfileWhereInput {
    return {
        isVisible: true,
        verificationStatus: TeacherVerificationStatus.VERIFIED,
        user: activeTeacherAccountWhere(additionalUserWhere),
    };
}

export function publishedTeacherMediaOwnerWhere(): Prisma.UserWhereInput {
    return activeTeacherAccountWhere({
        teacherProfile: {
            is: {
                verificationStatus: TeacherVerificationStatus.VERIFIED,
            },
        },
    });
}
