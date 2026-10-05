import type { FindTeachersQueryDto } from './dto/find-teachers-query.dto';
import { minimumTeacherPrice } from './teacher-public-profile.mapper';

type TeacherDirectoryFilterSource = {
    city: string | null;
    experienceYears: number | null;
    rating: unknown;
    price45: unknown;
    price60: unknown;
    price90: unknown;
    user: {
        teacherSubjects: Array<{ subjectId: number }>;
        teacherSubjectPreparations: Array<{
            subjectId: number;
            preparationId: number;
        }>;
        teacherAgeGroups: Array<{ ageGroupId: number }>;
    };
};

function normalize(value: string): string {
    return value.trim().toLocaleLowerCase('ru-RU');
}

export function matchesTeacherDirectoryFilters(
    profile: TeacherDirectoryFilterSource,
    query: FindTeachersQueryDto,
): boolean {
    if (
        query.subject_id
        && !profile.user.teacherSubjects.some(
            (link) => link.subjectId === query.subject_id,
        )
    ) {
        return false;
    }

    if (
        query.preparation_id
        && !profile.user.teacherSubjectPreparations.some((link) => (
            link.preparationId === query.preparation_id
            && (!query.subject_id || link.subjectId === query.subject_id)
        ))
    ) {
        return false;
    }

    if (
        query.age_group_id
        && !profile.user.teacherAgeGroups.some(
            (link) => link.ageGroupId === query.age_group_id,
        )
    ) {
        return false;
    }

    if (
        query.city?.trim()
        && normalize(profile.city ?? '') !== normalize(query.city)
    ) {
        return false;
    }

    if (
        query.min_experience !== undefined
        && (profile.experienceYears ?? 0) < query.min_experience
    ) {
        return false;
    }

    if (query.max_price !== undefined) {
        const minimumPrice = minimumTeacherPrice(profile);

        if (minimumPrice === null || minimumPrice > query.max_price) {
            return false;
        }
    }

    return query.min_rating === undefined
        || Number(profile.rating) >= query.min_rating;
}

export function teacherDirectoryCities(
    profiles: Array<Pick<TeacherDirectoryFilterSource, 'city'>>,
): string[] {
    const cities = new Map<string, string>();

    for (const profile of profiles) {
        const city = profile.city?.trim();

        if (city && !cities.has(normalize(city))) {
            cities.set(normalize(city), city);
        }
    }

    return [...cities.values()].sort((left, right) => (
        left.localeCompare(right, 'ru-RU')
    ));
}
