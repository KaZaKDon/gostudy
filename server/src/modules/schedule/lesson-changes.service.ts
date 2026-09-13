import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client';
import {
    LessonChangeStatus,
    LessonChangeType,
    LessonSessionStatus,
    LessonStatus,
    UserRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { RequestLessonChangeDto } from './dto/request-lesson-change.dto';
import type { RespondLessonChangeDto } from './dto/respond-lesson-change.dto';
import type { WithdrawLessonChangeDto } from './dto/withdraw-lesson-change.dto';
import {
    formatInTimezone,
    parseLocalDateTime,
    resolveTimezone,
    zonedDateTimeToUtc,
} from './schedule-time';

const MAX_LESSON_DURATION_MINUTES = 90;
const CHANGEABLE_LESSON_STATUSES: LessonStatus[] = [
    LessonStatus.SCHEDULED,
    LessonStatus.RESCHEDULED,
];

@Injectable()
export class LessonChangesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async requestChange(
        user: SessionUser,
        input: RequestLessonChangeDto,
    ): Promise<Record<string, unknown>> {
        this.requireParticipantRole(user);
        const comment = input.comment.trim();

        if (!comment) {
            throw new BadRequestException('Объясните причину предложения');
        }

        return this.prisma.$transaction(async (transaction) => {
            const lesson = await transaction.lesson.findFirst({
                where: {
                    id: input.lesson_id,
                    OR: [
                        { teacherId: user.id },
                        { studentId: user.id },
                    ],
                },
                include: {
                    subject: { select: { name: true } },
                    session: { select: { status: true } },
                },
            });

            if (!lesson) {
                throw new NotFoundException('Урок не найден');
            }

            this.requireChangeableLesson(lesson);

            const pending = await transaction.lessonChangeRequest.findFirst({
                where: {
                    lessonId: lesson.id,
                    status: LessonChangeStatus.PENDING,
                },
                select: { id: true },
            });

            if (pending) {
                throw new ConflictException(
                    'По этому уроку уже ожидается ответ на предложение',
                );
            }

            const requestType = input.request_type === 'reschedule'
                ? LessonChangeType.RESCHEDULE
                : LessonChangeType.CANCEL;
            let proposedLessonDate: Date | null = null;

            if (requestType === LessonChangeType.RESCHEDULE) {
                proposedLessonDate = await this.parseProposedDate(
                    transaction,
                    user,
                    input.proposed_lesson_date,
                );

                if (proposedLessonDate.getTime() === lesson.lessonDate.getTime()) {
                    throw new BadRequestException('Новое время совпадает с текущим');
                }

                await this.requireNoConflict(
                    transaction,
                    lesson.teacherId,
                    lesson.studentId,
                    proposedLessonDate,
                    lesson.durationMinutes,
                    lesson.id,
                );
            }

            const changeRequest = await transaction.lessonChangeRequest.create({
                data: {
                    lessonId: lesson.id,
                    requestedBy: user.id,
                    requestedRole: user.role,
                    requestType,
                    originalLessonDate: lesson.lessonDate,
                    proposedLessonDate,
                    requestComment: comment,
                },
            });
            const recipient = this.otherParticipant(lesson, user.id);
            const targetDate = proposedLessonDate ?? lesson.lessonDate;

            await this.notifications.create(transaction, {
                userId: recipient.id,
                type: requestType === LessonChangeType.RESCHEDULE
                    ? 'lesson_reschedule_requested'
                    : 'lesson_cancel_requested',
                title: requestType === LessonChangeType.RESCHEDULE
                    ? 'Предложен перенос урока'
                    : 'Предложена отмена урока',
                message: `${user.fullName || 'Участник урока'} предлагает ${
                    requestType === LessonChangeType.RESCHEDULE
                        ? 'перенести'
                        : 'отменить'
                } урок «${lesson.subject?.name || lesson.title || 'Занятие'}».`,
                targetSection: 'schedule',
                targetEntityType: 'lesson_change',
                targetEntityId: changeRequest.id,
                targetDate: await this.targetDate(
                    transaction,
                    recipient.id,
                    recipient.role,
                    targetDate,
                ),
                dedupeKey: `lesson-change-request:${changeRequest.id}`,
            });

            return {
                success: true,
                message: requestType === LessonChangeType.RESCHEDULE
                    ? 'Предложение переноса отправлено'
                    : 'Предложение отмены отправлено',
                change_request: {
                    id: changeRequest.id,
                    lesson_id: lesson.id,
                    requested_by: user.id,
                    requested_role: user.role.toLowerCase(),
                    requester_name: user.fullName,
                    request_type: requestType.toLowerCase(),
                    status: LessonChangeStatus.PENDING.toLowerCase(),
                    request_comment: comment,
                    can_respond: false,
                    can_withdraw: true,
                },
            };
        }, { isolationLevel: 'Serializable' });
    }

    async respondChange(
        user: SessionUser,
        input: RespondLessonChangeDto,
    ): Promise<Record<string, unknown>> {
        this.requireParticipantRole(user);
        const comment = input.comment.trim();

        if (input.decision === 'reject' && !comment) {
            throw new BadRequestException('Объясните причину отказа');
        }

        return this.prisma.$transaction(async (transaction) => {
            const request = await transaction.lessonChangeRequest.findFirst({
                where: {
                    id: input.request_id,
                    lesson: {
                        OR: [
                            { teacherId: user.id },
                            { studentId: user.id },
                        ],
                    },
                },
                include: {
                    lesson: {
                        include: {
                            subject: { select: { name: true } },
                            session: { select: { status: true } },
                        },
                    },
                },
            });

            if (!request) {
                throw new NotFoundException('Предложение не найдено');
            }

            if (request.requestedBy === user.id) {
                throw new ForbiddenException(
                    'Нельзя отвечать на собственное предложение',
                );
            }

            if (request.status !== LessonChangeStatus.PENDING) {
                throw new ConflictException('На это предложение уже дан ответ');
            }

            if (!CHANGEABLE_LESSON_STATUSES.includes(request.lesson.status)) {
                throw new ConflictException('Состояние урока уже изменилось');
            }

            if (input.decision === 'approve') {
                this.requireChangeableLesson(request.lesson);

                if (request.requestType === LessonChangeType.RESCHEDULE) {
                    const proposedLessonDate = request.proposedLessonDate;

                    if (!proposedLessonDate || proposedLessonDate <= new Date()) {
                        throw new ConflictException(
                            'Предложенное время уже недоступно',
                        );
                    }

                    await this.requireNoConflict(
                        transaction,
                        request.lesson.teacherId,
                        request.lesson.studentId,
                        proposedLessonDate,
                        request.lesson.durationMinutes,
                        request.lesson.id,
                    );
                    await transaction.lesson.update({
                        where: { id: request.lesson.id },
                        data: {
                            lessonDate: proposedLessonDate,
                            status: LessonStatus.RESCHEDULED,
                        },
                    });
                } else {
                    await transaction.lesson.update({
                        where: { id: request.lesson.id },
                        data: { status: LessonStatus.CANCELLED },
                    });
                }
            }

            const requestStatus = input.decision === 'approve'
                ? LessonChangeStatus.APPROVED
                : LessonChangeStatus.REJECTED;

            await transaction.lessonChangeRequest.update({
                where: { id: request.id },
                data: {
                    status: requestStatus,
                    responseComment: comment || null,
                    respondedBy: user.id,
                    respondedAt: new Date(),
                },
            });
            await this.notifications.markDedupeRead(
                transaction,
                user.id,
                `lesson-change-request:${request.id}`,
            );

            const targetDate = input.decision === 'approve'
                && request.requestType === LessonChangeType.RESCHEDULE
                && request.proposedLessonDate
                ? request.proposedLessonDate
                : request.lesson.lessonDate;
            const actionName = request.requestType === LessonChangeType.RESCHEDULE
                ? 'перенос'
                : 'отмену';

            await this.notifications.create(transaction, {
                userId: request.requestedBy,
                type: input.decision === 'approve'
                    ? 'lesson_change_approved'
                    : 'lesson_change_rejected',
                title: input.decision === 'approve'
                    ? 'Предложение принято'
                    : 'Предложение отклонено',
                message: `${user.fullName || 'Участник урока'} ${
                    input.decision === 'approve' ? 'принял(а)' : 'отклонил(а)'
                } ${actionName} урока «${
                    request.lesson.subject?.name
                    || request.lesson.title
                    || 'Занятие'
                }».`,
                targetSection: 'schedule',
                targetEntityType: 'lesson_change',
                targetEntityId: request.id,
                targetDate: await this.targetDate(
                    transaction,
                    request.requestedBy,
                    request.requestedRole,
                    targetDate,
                ),
                dedupeKey: `lesson-change-response:${request.id}`,
            });

            if (input.decision === 'approve') {
                const rescheduled = request.requestType
                    === LessonChangeType.RESCHEDULE;
                await this.notifications.createForActiveParents(
                    transaction,
                    request.lesson.studentId,
                    {
                        category: 'schedule',
                        type: rescheduled
                            ? 'parent_lesson_rescheduled'
                            : 'parent_lesson_cancelled',
                        title: rescheduled
                            ? 'Урок перенесён'
                            : 'Урок отменён',
                        message:
                            request.lesson.subject?.name
                            || request.lesson.title
                            || 'Занятие',
                        targetSection: 'schedule',
                        targetEntityType: 'lesson',
                        targetEntityId: request.lesson.id,
                        targetDate: await this.targetDate(
                            transaction,
                            request.lesson.studentId,
                            UserRole.STUDENT,
                            targetDate,
                        ),
                        dedupeKey: `lesson-change-approved:${request.id}`,
                    },
                );
            }

            return {
                success: true,
                message: input.decision === 'approve'
                    ? 'Предложение принято'
                    : 'Предложение отклонено',
                lesson_id: request.lesson.id,
                request_status: requestStatus.toLowerCase(),
            };
        }, { isolationLevel: 'Serializable' });
    }

    async withdrawChange(
        user: SessionUser,
        input: WithdrawLessonChangeDto,
    ): Promise<Record<string, unknown>> {
        this.requireParticipantRole(user);

        return this.prisma.$transaction(async (transaction) => {
            const request = await transaction.lessonChangeRequest.findFirst({
                where: {
                    id: input.request_id,
                    requestedBy: user.id,
                    status: LessonChangeStatus.PENDING,
                    lesson: {
                        OR: [
                            { teacherId: user.id },
                            { studentId: user.id },
                        ],
                    },
                },
                include: {
                    lesson: {
                        include: {
                            subject: { select: { name: true } },
                        },
                    },
                },
            });

            if (!request) {
                throw new NotFoundException(
                    'Ожидающее предложение не найдено',
                );
            }

            await transaction.lessonChangeRequest.update({
                where: { id: request.id },
                data: { status: LessonChangeStatus.WITHDRAWN },
            });

            const recipient = this.otherParticipant(request.lesson, user.id);

            await this.notifications.markDedupeRead(
                transaction,
                recipient.id,
                `lesson-change-request:${request.id}`,
            );
            await this.notifications.create(transaction, {
                userId: recipient.id,
                type: 'lesson_change_withdrawn',
                title: 'Предложение отозвано',
                message: `${user.fullName || 'Участник урока'} отозвал(а) предложение ${
                    request.requestType === LessonChangeType.RESCHEDULE
                        ? 'переноса'
                        : 'отмены'
                } урока «${
                    request.lesson.subject?.name
                    || request.lesson.title
                    || 'Занятие'
                }».`,
                targetSection: 'schedule',
                targetEntityType: 'lesson_change',
                targetEntityId: request.id,
                targetDate: await this.targetDate(
                    transaction,
                    recipient.id,
                    recipient.role,
                    request.lesson.lessonDate,
                ),
                dedupeKey: `lesson-change-withdrawn:${request.id}`,
            });

            return {
                success: true,
                message: 'Предложение отозвано',
            };
        }, { isolationLevel: 'Serializable' });
    }

    private requireParticipantRole(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER && user.role !== UserRole.STUDENT) {
            throw new ForbiddenException(
                'Изменять урок может только его участник',
            );
        }
    }

    private requireChangeableLesson(lesson: {
        status: LessonStatus;
        lessonDate: Date;
        session?: { status: LessonSessionStatus } | null;
    }): void {
        if (
            !CHANGEABLE_LESSON_STATUSES.includes(lesson.status)
            || lesson.lessonDate <= new Date()
            || lesson.session?.status === LessonSessionStatus.ACTIVE
            || lesson.session?.status === LessonSessionStatus.ENDED
        ) {
            throw new ConflictException(
                'Этот урок уже нельзя перенести или отменить',
            );
        }
    }

    private async parseProposedDate(
        transaction: Prisma.TransactionClient,
        user: SessionUser,
        value: string | null | undefined,
    ): Promise<Date> {
        const localDate = value ? parseLocalDateTime(value) : null;

        if (!localDate) {
            throw new BadRequestException(
                'Укажите корректные дату и время переноса',
            );
        }

        const timezone = await this.userTimezone(
            transaction,
            user.id,
            user.role,
        );
        const proposedDate = zonedDateTimeToUtc(localDate, timezone);
        const latestAllowedDate = new Date();

        latestAllowedDate.setUTCFullYear(latestAllowedDate.getUTCFullYear() + 1);

        if (proposedDate <= new Date()) {
            throw new BadRequestException(
                'Перенести урок можно только на будущее время',
            );
        }

        if (proposedDate > latestAllowedDate) {
            throw new BadRequestException(
                'Урок нельзя перенести более чем на год вперёд',
            );
        }

        return proposedDate;
    }

    private async requireNoConflict(
        transaction: Prisma.TransactionClient,
        teacherId: number,
        studentId: number,
        lessonDate: Date,
        durationMinutes: number,
        excludedLessonId: number,
    ): Promise<void> {
        const lessonEnd = new Date(
            lessonDate.getTime() + durationMinutes * 60_000,
        );
        const conflictWindowStart = new Date(
            lessonDate.getTime()
            - MAX_LESSON_DURATION_MINUTES * 60_000,
        );
        const possibleConflicts = await transaction.lesson.findMany({
            where: {
                id: { not: excludedLessonId },
                status: { in: CHANGEABLE_LESSON_STATUSES },
                lessonDate: {
                    gte: conflictWindowStart,
                    lt: lessonEnd,
                },
                OR: [
                    { teacherId },
                    { studentId },
                ],
            },
            select: {
                teacherId: true,
                studentId: true,
                lessonDate: true,
                durationMinutes: true,
            },
        });
        const conflict = possibleConflicts.find((lesson) =>
            lesson.lessonDate.getTime() + lesson.durationMinutes * 60_000
                > lessonDate.getTime(),
        );

        if (conflict) {
            throw new ConflictException(
                conflict.teacherId === teacherId
                    ? 'У преподавателя уже есть занятие, пересекающееся по времени'
                    : 'У ученика уже есть занятие, пересекающееся по времени',
            );
        }
    }

    private otherParticipant(
        lesson: { teacherId: number; studentId: number },
        userId: number,
    ): { id: number; role: UserRole } {
        return lesson.teacherId === userId
            ? { id: lesson.studentId, role: UserRole.STUDENT }
            : { id: lesson.teacherId, role: UserRole.TEACHER };
    }

    private async targetDate(
        transaction: Prisma.TransactionClient,
        userId: number,
        role: UserRole,
        date: Date,
    ): Promise<string> {
        const timezone = await this.userTimezone(transaction, userId, role);

        return formatInTimezone(date, timezone)?.slice(0, 10) ?? '';
    }

    private async userTimezone(
        transaction: Prisma.TransactionClient,
        userId: number,
        role: UserRole,
    ): Promise<string> {
        if (role === UserRole.TEACHER) {
            const profile = await transaction.teacherProfile.findUnique({
                where: { userId },
                select: { timezone: true },
            });

            return resolveTimezone(profile?.timezone);
        }

        const profile = await transaction.studentProfile.findUnique({
            where: { userId },
            select: { timezone: true },
        });

        return resolveTimezone(profile?.timezone);
    }
}
