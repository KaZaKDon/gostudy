import { describe, expect, it } from 'vitest';

import { TeacherVerificationStatus } from '../../generated/prisma/enums';
import { teacherBadgeKeys } from './teacher-badges';

function profile(teacherDocuments: unknown[]) {
    return {
        experienceYears: 2,
        introVideoUrl: null,
        accessibilityEnabled: false,
        reviewsCount: 0,
        verificationStatus: TeacherVerificationStatus.VERIFIED,
        user: {
            phone: null,
            emailVerifiedAt: null,
            lastLoginAt: null,
            createdAt: new Date(),
            teacherEducation: [{ id: 1 }],
            teacherDocuments,
        },
    };
}

describe('teacherBadgeKeys verified education', () => {
    it('does not award the badge for an unverified education form alone', () => {
        expect(teacherBadgeKeys(profile([]), {
            rank: null,
            completedLessons: 0,
        })).not.toContain('verified_education');
    });

    it('awards the badge when an approved document is present', () => {
        expect(teacherBadgeKeys(profile([{ id: 7 }]), {
            rank: null,
            completedLessons: 0,
        })).toContain('verified_education');
    });
});
