import { describe, expect, it } from 'vitest';

import {
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import {
    activeTeacherAccountWhere,
    publicTeacherProfileWhere,
    publishedTeacherMediaOwnerWhere,
} from './teacher-publication-policy';

describe('teacher publication policy', () => {
    it('uses one active-teacher rule for catalog queries', () => {
        expect(publicTeacherProfileWhere({
            teacherSubjects: { some: { subjectId: 7 } },
        })).toEqual({
            isVisible: true,
            verificationStatus: TeacherVerificationStatus.VERIFIED,
            user: {
                role: UserRole.TEACHER,
                status: UserStatus.ACTIVE,
                teacherSubjects: { some: { subjectId: 7 } },
            },
        });
    });

    it('does not allow an additional filter to weaken account status', () => {
        expect(activeTeacherAccountWhere({
            role: UserRole.STUDENT,
            status: UserStatus.BLOCKED,
        })).toEqual({
            role: UserRole.TEACHER,
            status: UserStatus.ACTIVE,
        });
    });

    it('requires a verified profile for a public media owner', () => {
        expect(publishedTeacherMediaOwnerWhere()).toEqual({
            role: UserRole.TEACHER,
            status: UserStatus.ACTIVE,
            teacherProfile: {
                is: {
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                },
            },
        });
    });
});
