import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { adultBirthDateCutoff } from '../../common/date/birth-date';
import {
    LessonChangeStatus,
    LessonStatus,
    ParentChildVerificationStatus,
    ParentStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ScheduleQueryDto } from './dto/schedule-query.dto';
import {
    addCalendarDays,
    calendarDayDifference,
    formatInTimezone,
    parseCalendarDate,
    resolveTimezone,
    zonedDateTimeToUtc,
} from './schedule-time';

@Injectable()
export class ScheduleService {
    constructor(private readonly prisma: PrismaService) {}

    async getSchedule(
        user: SessionUser,
        query: ScheduleQueryDto,
    ): Promise<Record<string, unknown>> {
        if (
            user.role !== UserRole.TEACHER
            && user.role !== UserRole.STUDENT
            && user.role !== UserRole.PARENT
        ) {
            throw new ForbiddenException(
                'Расписание доступно только участникам обучения',
            );
        }

        const from = parseCalendarDate(query.from);
        const to = parseCalendarDate(query.to);

        if (!from || !to) {
            throw new BadRequestException('Указан некорректный период расписания');
        }

        const dayCount = calendarDayDifference(from, to);

        if (dayCount < 0) {
            throw new BadRequestException(
                'Дата окончания периода меньше даты начала',
            );
        }

        if (dayCount > 31) {
            throw new BadRequestException(
                'За один запрос можно получить не более 32 дней расписания',
            );
        }

        const parentContext = user.role === UserRole.PARENT
            ? await this.getParentScheduleContext(
                user,
                query.student_id,
                query.lesson_id,
            )
            : null;
        const timezone = parentContext?.timezone
            ?? await this.getViewerTimezone(user);
        const dateFrom = zonedDateTimeToUtc(from, timezone);
        const dateToExclusive = zonedDateTimeToUtc(
            addCalendarDays(to, 1),
            timezone,
        );
        const participant = user.role === UserRole.TEACHER
            ? { teacherId: user.id }
            : {
                studentId: parentContext?.selectedStudentId ?? user.id,
            };
        const lessons = await this.prisma.lesson.findMany({
            where: {
                ...participant,
                ...(parentContext && query.lesson_id
                    ? {
                        OR: [
                            { status: { not: LessonStatus.CANCELLED } },
                            { id: query.lesson_id },
                        ],
                    }
                    : { status: { not: LessonStatus.CANCELLED } }),
                lessonDate: {
                    gte: dateFrom,
                    lt: dateToExclusive,
                },
            },
            orderBy: [
                { lessonDate: 'asc' },
                { id: 'asc' },
            ],
            include: {
                teacher: { select: { fullName: true } },
                student: { select: { fullName: true } },
                subject: { select: { name: true } },
                session: true,
                changeRequests: {
                    orderBy: [
                        { createdAt: 'desc' },
                        { id: 'desc' },
                    ],
                    include: {
                        requester: { select: { fullName: true } },
                    },
                },
            },
        });

        return {
            success: true,
            schedule: lessons.map((lesson) => {
                const pendingChange = lesson.changeRequests.find(
                    (request) => request.status === LessonChangeStatus.PENDING,
                ) ?? null;
                const lastChange = lesson.changeRequests.find(
                    (request) => request.status !== LessonChangeStatus.PENDING,
                ) ?? null;

                return {
                    id: lesson.id,
                    teacher_id: lesson.teacherId,
                    student_id: lesson.studentId,
                    subject_id: lesson.subjectId,
                    title: lesson.title,
                    lesson_date: formatInTimezone(lesson.lessonDate, timezone),
                    duration_minutes: lesson.durationMinutes,
                    status: lesson.status.toLowerCase(),
                    lesson_topic: lesson.lessonTopic,
                    lesson_notes: lesson.lessonNotes,
                    classroom_status: lesson.session?.status.toLowerCase() ?? null,
                    classroom_started_at: formatInTimezone(
                        lesson.session?.startedAt ?? null,
                        timezone,
                    ),
                    classroom_ended_at: formatInTimezone(
                        lesson.session?.endedAt ?? null,
                        timezone,
                    ),
                    subject_name: lesson.subject?.name ?? null,
                    teacher_name: lesson.teacher.fullName,
                    student_name: lesson.student.fullName,
                    change_request: pendingChange
                        ? this.changeToApi(
                            pendingChange,
                            timezone,
                            user.id,
                            user.role !== UserRole.PARENT,
                        )
                        : null,
                    last_change: lastChange
                        ? this.changeToApi(
                            lastChange,
                            timezone,
                            user.id,
                            false,
                        )
                        : null,
                };
            }),
            period: {
                from: query.from,
                to: query.to,
                timezone,
                viewer_now: formatInTimezone(new Date(), timezone),
            },
            ...(parentContext
                ? {
                    children: parentContext.children,
                    selected_student_id: parentContext.selectedStudentId,
                    read_only: true,
                }
                : {}),
        };
    }

    private async getParentScheduleContext(
        user: SessionUser,
        requestedStudentId?: number,
        requestedLessonId?: number,
    ): Promise<{
        children: Array<{
            student_id: number;
            full_name: string;
        }>;
        selectedStudentId: number;
        timezone: string;
    }> {
        const links = await this.prisma.parentStudent.findMany({
            where: {
                parentId: user.id,
                status: ParentStudentStatus.ACTIVE,
                verifiedAt: { not: null },
            },
            select: { studentId: true },
        });
        const linkedStudentIds = links.map((link) => link.studentId);

        if (linkedStudentIds.length === 0) {
            throw new BadRequestException(
                'Сначала привяжите подтверждённый аккаунт ребёнка',
            );
        }

        const adultBirthDate = adultBirthDateCutoff();

        const childProfiles = await this.prisma.parentChildProfile.findMany({
            where: {
                parentId: user.id,
                studentId: { in: linkedStudentIds },
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                verifiedAt: { not: null },
                archivedAt: null,
                birthDate: { gt: adultBirthDate },
            },
            orderBy: [
                { createdAt: 'asc' },
                { id: 'asc' },
            ],
            select: {
                studentId: true,
                firstName: true,
                lastName: true,
                middleName: true,
                timezone: true,
                student: {
                    select: {
                        studentProfile: {
                            select: { timezone: true },
                        },
                    },
                },
            },
        });
        const children = childProfiles.flatMap((child) => {
            if (!child.studentId) {
                return [];
            }

            return [{
                studentId: child.studentId,
                fullName: [
                    child.lastName,
                    child.firstName,
                    child.middleName,
                ].filter(Boolean).join(' '),
                timezone:
                    child.student?.studentProfile?.timezone
                    || child.timezone,
            }];
        });

        if (children.length === 0) {
            throw new BadRequestException(
                'Нет доступных расписаний несовершеннолетних детей',
            );
        }

        let selected = requestedStudentId
            ? children.find((child) => child.studentId === requestedStudentId)
            : children[0];

        if (requestedLessonId) {
            const targetLesson = await this.prisma.lesson.findFirst({
                where: {
                    id: requestedLessonId,
                    studentId: { in: children.map((child) => child.studentId) },
                },
                select: { studentId: true },
            });

            if (!targetLesson) {
                throw new ForbiddenException(
                    'Этот урок недоступен родителю',
                );
            }

            selected = children.find(
                (child) => child.studentId === targetLesson.studentId,
            );
        }

        if (!selected) {
            throw new ForbiddenException(
                'Расписание этого ученика недоступно родителю',
            );
        }

        return {
            children: children.map((child) => ({
                student_id: child.studentId,
                full_name: child.fullName,
            })),
            selectedStudentId: selected.studentId,
            timezone: resolveTimezone(selected.timezone),
        };
    }

    private async getViewerTimezone(user: SessionUser): Promise<string> {
        if (user.role === UserRole.TEACHER) {
            const profile = await this.prisma.teacherProfile.findUnique({
                where: { userId: user.id },
                select: { timezone: true },
            });

            return resolveTimezone(profile?.timezone);
        }

        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: user.id },
            select: { timezone: true },
        });

        return resolveTimezone(profile?.timezone);
    }

    private changeToApi(
        change: {
            id: number;
            lessonId: number;
            requestedBy: number;
            requestedRole: UserRole;
            requestType: { toLowerCase(): string };
            status: { toLowerCase(): string };
            originalLessonDate: Date;
            proposedLessonDate: Date | null;
            requestComment: string;
            responseComment: string | null;
            respondedBy: number | null;
            respondedAt: Date | null;
            createdAt: Date;
            requester: { fullName: string | null };
        },
        timezone: string,
        viewerId: number,
        canAct: boolean,
    ): Record<string, unknown> {
        return {
            id: change.id,
            lesson_id: change.lessonId,
            requested_by: change.requestedBy,
            requested_role: change.requestedRole.toLowerCase(),
            requester_name: change.requester.fullName,
            request_type: change.requestType.toLowerCase(),
            status: change.status.toLowerCase(),
            original_lesson_date: formatInTimezone(
                change.originalLessonDate,
                timezone,
            ),
            proposed_lesson_date: formatInTimezone(
                change.proposedLessonDate,
                timezone,
            ),
            request_comment: change.requestComment,
            response_comment: change.responseComment,
            responded_by: change.respondedBy,
            responded_at: formatInTimezone(change.respondedAt, timezone),
            created_at: formatInTimezone(change.createdAt, timezone),
            can_respond: canAct
                && change.status === LessonChangeStatus.PENDING
                && change.requestedBy !== viewerId,
            can_withdraw: canAct
                && change.status === LessonChangeStatus.PENDING
                && change.requestedBy === viewerId,
        };
    }
}
