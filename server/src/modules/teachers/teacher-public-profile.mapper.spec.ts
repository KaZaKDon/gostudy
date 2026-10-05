import { describe, expect, it } from 'vitest';

import {
    minimumTeacherPrice,
    teacherDisplayName,
    teacherLessonFormats,
    toTeacherSearchCard,
} from './teacher-public-profile.mapper';

const profile = {
    userId: 7,
    firstName: 'Анна',
    lastName: 'Учитель',
    slug: 'anna-teacher',
    city: 'Москва',
    headline: 'Английский язык',
    experienceYears: 8,
    rating: 4.9,
    reviewsCount: 12,
    price45: 900,
    price60: 1_100,
    price90: null,
    user: {
        fullName: 'Анна Учитель',
        avatarUrl: '/uploads/teachers/anna.jpg',
        teacherSubjects: [{ subject: { name: 'Английский язык' } }],
    },
};

describe('teacher public profile mapper', () => {
    it('builds one shared public search-card contract', () => {
        expect(toTeacherSearchCard(profile, {
            rank: 2,
            rankScope: 'subject',
            completedLessonsCount: 34,
            accessibilityEnabled: true,
            badges: ['verified_identity'],
        })).toEqual(expect.objectContaining({
            teacher_id: 7,
            name: 'Анна Учитель',
            rank: 2,
            rank_scope: 'subject',
            price_from: 900,
            completed_lessons_count: 34,
            accessibility_enabled: true,
            subjects: ['Английский язык'],
        }));
    });

    it('uses the account name when profile names are absent', () => {
        expect(teacherDisplayName({
            firstName: null,
            lastName: null,
            user: { fullName: 'Имя из аккаунта' },
        })).toBe('Имя из аккаунта');
    });

    it('normalizes public prices and lesson formats', () => {
        expect(minimumTeacherPrice(profile)).toBe(900);
        expect(teacherLessonFormats(profile)).toEqual([
            { duration: 45, price: 900 },
            { duration: 60, price: 1_100 },
        ]);
    });
});
