const PRIOR_RATING = 4;
const REVIEW_CONFIDENCE = 10;
const MAX_LESSON_BONUS = 0.15;
const LESSON_BONUS_CAP = 300;
export const MIN_REVIEWS_FOR_RANKING = 3;

export interface TeacherRankingCandidate {
    teacherId: number;
    rating: number;
    reviewsCount: number;
    completedLessonsCount: number;
}

export interface RankedTeacher extends TeacherRankingCandidate {
    rank: number | null;
    rankingScore: number;
}

export function teacherRankingScore(
    candidate: TeacherRankingCandidate,
): number {
    const lessons = Math.max(0, candidate.completedLessonsCount);
    const reviews = Math.max(0, candidate.reviewsCount);

    if (reviews === 0) {
        return Math.min(lessons, LESSON_BONUS_CAP) / 1_000_000;
    }

    const rating = Math.min(5, Math.max(1, candidate.rating));
    const adjustedRating = (
        rating * reviews
        + PRIOR_RATING * REVIEW_CONFIDENCE
    ) / (reviews + REVIEW_CONFIDENCE);
    const lessonBonus = (
        Math.log10(Math.min(lessons, LESSON_BONUS_CAP) + 1)
        / Math.log10(LESSON_BONUS_CAP + 1)
    ) * MAX_LESSON_BONUS;

    return adjustedRating + lessonBonus;
}

export function rankTeachers(
    candidates: TeacherRankingCandidate[],
): RankedTeacher[] {
    const sorted = candidates
        .map((candidate) => ({
            ...candidate,
            rankingScore: teacherRankingScore(candidate),
            rankingEligible:
                candidate.reviewsCount >= MIN_REVIEWS_FOR_RANKING,
        }))
        .sort((left, right) => (
            Number(right.rankingEligible) - Number(left.rankingEligible)
            || right.rankingScore - left.rankingScore
            || right.reviewsCount - left.reviewsCount
            || right.completedLessonsCount - left.completedLessonsCount
            || left.teacherId - right.teacherId
        ));

    let previousScore: number | null = null;
    let currentRank = 0;
    let eligibleIndex = 0;

    return sorted.map((candidate) => {
        if (!candidate.rankingEligible) {
            return {
                ...candidate,
                rank: null,
            };
        }

        eligibleIndex += 1;
        if (
            previousScore === null
            || Math.abs(candidate.rankingScore - previousScore) > 0.000001
        ) {
            currentRank = eligibleIndex;
            previousScore = candidate.rankingScore;
        }

        return {
            ...candidate,
            rank: currentRank,
        };
    });
}
