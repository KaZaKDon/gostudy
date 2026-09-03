import {
    LessonSessionStatus,
    LessonStatus,
    UserRole,
} from '../../generated/prisma/enums';

export const CLASSROOM_ENTRY_ADVANCE_MINUTES = 15;
export const CLASSROOM_START_GRACE_MINUTES = 30;
export const CLASSROOM_PRESENCE_TIMEOUT_SECONDS = 20;

export type ClassroomAccess = {
    canJoin: boolean;
    canStart: boolean;
    canFinish: boolean;
    canChat: boolean;
    canManageFiles: boolean;
    canShareMaterial: boolean;
    isReadOnly: boolean;
    reason: string | null;
    availableAt: Date;
    scheduledEndAt: Date;
    startDeadlineAt: Date;
};

type ClassroomAccessInput = {
    lessonDate: Date;
    durationMinutes: number;
    lessonStatus: LessonStatus;
    sessionStatus?: LessonSessionStatus | null;
    role: UserRole;
};

export function calculateClassroomAccess(
    input: ClassroomAccessInput,
    now = new Date(),
): ClassroomAccess {
    const durationMilliseconds = Math.max(1, input.durationMinutes) * 60_000;
    const lessonEnd = new Date(input.lessonDate.getTime() + durationMilliseconds);
    const availableAt = new Date(
        input.lessonDate.getTime() - CLASSROOM_ENTRY_ADVANCE_MINUTES * 60_000,
    );
    const startDeadlineAt = new Date(
        lessonEnd.getTime() + CLASSROOM_START_GRACE_MINUTES * 60_000,
    );
    let sessionStatus = input.sessionStatus
        ?? (input.lessonStatus === LessonStatus.COMPLETED
            ? LessonSessionStatus.ENDED
            : LessonSessionStatus.WAITING);
    let reason: string | null = null;
    let canJoin = false;

    if (input.lessonStatus === LessonStatus.CANCELLED) {
        reason = 'Урок отменён';
    } else if (
        input.lessonStatus === LessonStatus.COMPLETED
        || sessionStatus === LessonSessionStatus.ENDED
    ) {
        sessionStatus = LessonSessionStatus.ENDED;
        reason = 'Урок завершён';
    } else if (sessionStatus === LessonSessionStatus.ACTIVE) {
        canJoin = true;
    } else if (now < availableAt) {
        reason = 'Вход откроется за 15 минут до начала урока';
    } else if (now > startDeadlineAt) {
        reason = 'Время входа в класс закончилось';
    } else if ([
        LessonStatus.SCHEDULED,
        LessonStatus.RESCHEDULED,
        LessonStatus.ACTIVE,
    ].includes(input.lessonStatus)) {
        canJoin = true;
    } else {
        reason = 'Класс для этого урока недоступен';
    }

    const isTeacher = input.role === UserRole.TEACHER;

    return {
        canJoin,
        canStart: canJoin
            && isTeacher
            && sessionStatus === LessonSessionStatus.WAITING,
        canFinish: isTeacher && sessionStatus === LessonSessionStatus.ACTIVE,
        canChat: canJoin && (
            sessionStatus === LessonSessionStatus.WAITING
            || sessionStatus === LessonSessionStatus.ACTIVE
        ),
        canManageFiles: canJoin
            && isTeacher
            && sessionStatus !== LessonSessionStatus.ENDED,
        canShareMaterial: canJoin
            && isTeacher
            && sessionStatus === LessonSessionStatus.ACTIVE,
        isReadOnly: !canJoin || sessionStatus === LessonSessionStatus.ENDED,
        reason,
        availableAt,
        scheduledEndAt: lessonEnd,
        startDeadlineAt,
    };
}

export function isClassroomParticipantPresent(
    lastSeenAt: Date | null | undefined,
    now = new Date(),
): boolean {
    return Boolean(
        lastSeenAt
        && lastSeenAt.getTime()
            >= now.getTime() - CLASSROOM_PRESENCE_TIMEOUT_SECONDS * 1000,
    );
}
