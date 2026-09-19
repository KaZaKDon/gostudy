import {
    MaterialCategory,
    TeacherVerificationStatus,
} from '../../generated/prisma/enums';

export interface TeacherBadgeProfile {
    experienceYears: number | null;
    introVideoUrl: string | null;
    accessibilityEnabled: boolean;
    reviewsCount: number;
    verificationStatus: TeacherVerificationStatus;
    user: {
        phone: string | null;
        emailVerifiedAt: Date | null;
        lastLoginAt: Date | null;
        createdAt: Date;
        teacherEducation: unknown[];
        teacherDocuments?: unknown[];
    };
}

export interface TeacherBadgeFacts {
    rank: number | null;
    completedLessons: number;
    materialCategories?: Set<MaterialCategory>;
    recentRatings?: number[];
    reliable?: boolean;
}

export function teacherBadgeKeys(
    profile: TeacherBadgeProfile,
    facts: TeacherBadgeFacts,
): string[] {
    const badges: string[] = [];

    if (
        profile.verificationStatus === TeacherVerificationStatus.VERIFIED
    ) badges.push('verified_identity');

    if ((profile.user.teacherDocuments ?? []).length) {
        badges.push('verified_education');
    }
    if (profile.user.emailVerifiedAt && profile.user.phone) badges.push('verified_contacts');
    if (profile.introVideoUrl) badges.push('video_intro');
    if (
        facts.materialCategories?.has(MaterialCategory.TEXTBOOK)
        || facts.materialCategories?.has(MaterialCategory.EXTRA)
    ) badges.push('materials_author');
    if (facts.materialCategories?.has(MaterialCategory.TRAINER)) badges.push('tests_author');
    if (facts.rank && facts.rank <= 10 && profile.reviewsCount > 0) badges.push('high_rating');

    if ((profile.experienceYears ?? 0) >= 30) badges.push('work_experience_30_years');
    else if ((profile.experienceYears ?? 0) >= 20) badges.push('work_experience_20_years');
    else if ((profile.experienceYears ?? 0) >= 10) badges.push('work_experience_10_years');

    const ratings = facts.recentRatings ?? [];
    if (
        ratings.length >= 30
        && ratings.slice(0, 30).every((rating) => rating === 5)
    ) badges.push('excellent_rating_streak_30');
    else if (
        ratings.length >= 10
        && ratings.slice(0, 10).every((rating) => rating === 5)
    ) badges.push('excellent_rating_streak_10');

    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    if (profile.user.createdAt <= yearAgo) badges.push('platform_tenure');

    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (
        profile.user.lastLoginAt
        && profile.user.lastLoginAt >= activeSince
    ) badges.push('active_profile');
    if (profile.accessibilityEnabled) badges.push('accessible_education');

    if (facts.completedLessons >= 300) badges.push('platform_lessons_300');
    else if (facts.completedLessons >= 100) badges.push('platform_lessons_100');
    else if (facts.completedLessons >= 30) badges.push('platform_lessons_30');
    else if (facts.completedLessons >= 10) badges.push('platform_lessons_10');
    if (facts.reliable) badges.push('reliable_teacher');

    return badges;
}
