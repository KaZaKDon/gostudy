export type TeacherNameSource = {
    firstName: string | null;
    lastName: string | null;
    user: { fullName: string | null };
};

export type TeacherPriceSource = {
    price45: unknown;
    price60: unknown;
    price90: unknown;
};

export type TeacherSearchCardSource = TeacherNameSource & TeacherPriceSource & {
    userId: number;
    slug: string | null;
    city: string | null;
    headline: string | null;
    experienceYears: number | null;
    rating: unknown;
    reviewsCount: number;
    user: TeacherNameSource['user'] & {
        avatarUrl: string | null;
        teacherSubjects: Array<{
            subject: { name: string };
        }>;
    };
};

export type TeacherSearchCardContext = {
    rank: number | null;
    rankScope: 'overall' | 'subject';
    completedLessonsCount: number;
    accessibilityEnabled: boolean;
    badges: string[];
};

export function teacherDisplayName(profile: TeacherNameSource): string {
    return [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(' ')
        || profile.user.fullName
        || 'Преподаватель';
}

export function minimumTeacherPrice(
    profile: TeacherPriceSource,
): number | null {
    const prices = [profile.price45, profile.price60, profile.price90]
        .map((price) => Number(price ?? 0))
        .filter((price) => price > 0);

    return prices.length ? Math.min(...prices) : null;
}

export function teacherLessonFormats(
    profile: TeacherPriceSource,
): Array<Record<string, number>> {
    return [
        [45, profile.price45],
        [60, profile.price60],
        [90, profile.price90],
    ].flatMap(([duration, rawPrice]) => {
        const price = Number(rawPrice ?? 0);
        return price > 0 ? [{ duration: Number(duration), price }] : [];
    });
}

export function toTeacherSearchCard(
    profile: TeacherSearchCardSource,
    context: TeacherSearchCardContext,
): Record<string, unknown> {
    return {
        teacher_id: profile.userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        name: teacherDisplayName(profile),
        slug: profile.slug,
        photo_url: profile.user.avatarUrl,
        city: profile.city,
        headline: profile.headline,
        experience_years: profile.experienceYears,
        rating: Number(profile.rating),
        reviews_count: profile.reviewsCount,
        rank: context.rank,
        rank_scope: context.rankScope,
        completed_lessons_count: context.completedLessonsCount,
        is_verified: true,
        accessibility_enabled: context.accessibilityEnabled,
        price_from: minimumTeacherPrice(profile),
        subjects: profile.user.teacherSubjects.map(
            (link) => link.subject.name,
        ),
        badges: context.badges,
    };
}
