import { describe, expect, it } from 'vitest';

import {
    rankTeachers,
    teacherRankingScore,
} from './teacher-ranking';

describe('teacher ranking', () => {
    it('does not assign a public place before three reviews', () => {
        const ranked = rankTeachers([
            {
                teacherId: 1,
                rating: 0,
                reviewsCount: 0,
                completedLessonsCount: 100,
            },
            {
                teacherId: 2,
                rating: 4,
                reviewsCount: 1,
                completedLessonsCount: 3,
            },
        ]);

        expect(ranked.map((item) => item.rank)).toEqual([null, null]);
    });

    it('places a teacher with three reviews above unranked profiles', () => {
        const ranked = rankTeachers([
            {
                teacherId: 1,
                rating: 5,
                reviewsCount: 2,
                completedLessonsCount: 100,
            },
            {
                teacherId: 2,
                rating: 4,
                reviewsCount: 3,
                completedLessonsCount: 3,
            },
        ]);

        expect(ranked.map((item) => item.teacherId)).toEqual([2, 1]);
        expect(ranked.map((item) => item.rank)).toEqual([1, null]);
    });

    it('gives more confidence to a stable rating from many children', () => {
        const threeReviews = teacherRankingScore({
            teacherId: 1,
            rating: 5,
            reviewsCount: 3,
            completedLessonsCount: 9,
        });
        const thirtyReviews = teacherRankingScore({
            teacherId: 2,
            rating: 4.9,
            reviewsCount: 30,
            completedLessonsCount: 90,
        });

        expect(thirtyReviews).toBeGreaterThan(threeReviews);
    });

    it('assigns the same public place to equal scores', () => {
        const ranked = rankTeachers([
            {
                teacherId: 2,
                rating: 4.8,
                reviewsCount: 10,
                completedLessonsCount: 30,
            },
            {
                teacherId: 1,
                rating: 4.8,
                reviewsCount: 10,
                completedLessonsCount: 30,
            },
        ]);

        expect(ranked.map((item) => item.rank)).toEqual([1, 1]);
    });
});
