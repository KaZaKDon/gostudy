import { describe, expect, it } from 'vitest';

import {
    matchesTeacherDirectoryFilters,
    teacherDirectoryCities,
} from './teacher-directory-filters';

function profile(overrides: Record<string, unknown> = {}) {
    return {
        city: ' Москва ',
        experienceYears: 8,
        rating: 4.8,
        price45: 900,
        price60: 1_100,
        price90: null,
        user: {
            teacherSubjects: [{ subjectId: 11 }],
            teacherSubjectPreparations: [{
                subjectId: 11,
                preparationId: 21,
            }],
            teacherAgeGroups: [{ ageGroupId: 31 }],
        },
        ...overrides,
    };
}

describe('teacher directory filters', () => {
    it('accepts a teacher matching all selected filters', () => {
        expect(matchesTeacherDirectoryFilters(profile(), {
            subject_id: 11,
            preparation_id: 21,
            age_group_id: 31,
            city: 'москва',
            min_experience: 5,
            max_price: 1_000,
            min_rating: 4.5,
            page: 1,
        })).toBe(true);
    });

    it('checks a preparation inside the selected subject', () => {
        const source = profile({
            user: {
                teacherSubjects: [{ subjectId: 11 }, { subjectId: 12 }],
                teacherSubjectPreparations: [{
                    subjectId: 12,
                    preparationId: 21,
                }],
                teacherAgeGroups: [{ ageGroupId: 31 }],
            },
        });

        expect(matchesTeacherDirectoryFilters(source, {
            subject_id: 11,
            preparation_id: 21,
            page: 1,
        })).toBe(false);
    });

    it('excludes teachers without a listed price from a price-limited search', () => {
        const source = profile({
            price45: null,
            price60: null,
            price90: null,
        });

        expect(matchesTeacherDirectoryFilters(source, {
            max_price: 1_500,
            page: 1,
        })).toBe(false);
    });

    it('returns unique trimmed cities in alphabetical order', () => {
        expect(teacherDirectoryCities([
            { city: ' Ростов-на-Дону ' },
            { city: 'москва' },
            { city: 'Москва' },
            { city: null },
        ])).toEqual(['москва', 'Ростов-на-Дону']);
    });
});
