import { describe, expect, it } from 'vitest';

import {
    LessonSessionStatus,
    LessonStatus,
    UserRole,
} from '../../generated/prisma/enums';
import {
    calculateClassroomAccess,
    isClassroomParticipantPresent,
} from './classroom-access';

const lessonDate = new Date('2026-09-03T12:00:00.000Z');

describe('classroom access', () => {
    it('opens a waiting room fifteen minutes before the lesson', () => {
        const access = calculateClassroomAccess({
            lessonDate,
            durationMinutes: 60,
            lessonStatus: LessonStatus.SCHEDULED,
            sessionStatus: LessonSessionStatus.WAITING,
            role: UserRole.TEACHER,
        }, new Date('2026-09-03T11:45:00.000Z'));

        expect(access).toMatchObject({
            canJoin: true,
            canStart: true,
            canFinish: false,
            canChat: true,
        });
    });

    it('keeps an active lesson available after its planned end', () => {
        const access = calculateClassroomAccess({
            lessonDate,
            durationMinutes: 45,
            lessonStatus: LessonStatus.SCHEDULED,
            sessionStatus: LessonSessionStatus.ACTIVE,
            role: UserRole.STUDENT,
        }, new Date('2026-09-03T15:00:00.000Z'));

        expect(access.canJoin).toBe(true);
        expect(access.canChat).toBe(true);
        expect(access.canFinish).toBe(false);
    });

    it('makes a completed lesson read-only', () => {
        const access = calculateClassroomAccess({
            lessonDate,
            durationMinutes: 60,
            lessonStatus: LessonStatus.COMPLETED,
            sessionStatus: LessonSessionStatus.ENDED,
            role: UserRole.TEACHER,
        });

        expect(access).toMatchObject({
            canJoin: false,
            canStart: false,
            canFinish: false,
            canChat: false,
            isReadOnly: true,
            reason: 'Урок завершён',
        });
    });

    it('treats a participant as present for twenty seconds', () => {
        const now = new Date('2026-09-03T12:00:20.000Z');

        expect(isClassroomParticipantPresent(
            new Date('2026-09-03T12:00:00.000Z'),
            now,
        )).toBe(true);
        expect(isClassroomParticipantPresent(
            new Date('2026-09-03T11:59:59.999Z'),
            now,
        )).toBe(false);
    });
});
