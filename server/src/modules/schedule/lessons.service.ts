import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateLessonDto } from './dto/create-lesson.dto';
import {
    formatInTimezone,
    parseLocalDateTime,
    resolveTimezone,
    zonedDateTimeToUtc,
} from './schedule-time';

const LESSON_DURATIONS = [45, 60, 90] as const;
const MAX_LESSON_DURATION_MINUTES = 90;

@Injectable()
export class LessonsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async getCreationOptions(user: SessionUser): Promise<Record<string, unknown>> {
        this.requireTeacher(user);

        const [profile, relations] = await Promise.all([
            this.prisma.teacherProfile.findUnique({
                where: { userId: user.id },
                select: {
                    timezone: true,
                    price45: true,
                    price60: true,
                    price90: true,
                },
            }),
            this.prisma.teacherStudent.findMany({
                where: {
                    teacherId: user.id,
                    status: TeacherStudentStatus.ACTIVE,
                    student: {
                        role: UserRole.STUDENT,
                        status: UserStatus.ACTIVE,
                    },
                    subject: { isActive: true },
                },
                orderBy: [
                    { student: { fullName: 'asc' } },
                    { subject: { name: 'asc' } },
                ],
                include: {
                    student: {
                        select: {
                            fullName: true,
                            studentProfile: { select: { timezone: true } },
                        },
                    },
                    subject: { select: { name: true } },
                },
            }),
        ]);

        if (!profile) {
            throw new NotFoundException('Профиль преподавателя не найден');
        }

        const prices = new Map<number, unknown>([
            [45, profile.price45],
            [60, profile.price60],
            [90, profile.price90],
        ]);
        const durations = LESSON_DURATIONS.flatMap((minutes) => {
            const price = Number(prices.get(minutes) ?? 0);

            return price > 0 ? [{ minutes, price }] : [];
        });

        return {
            success: true,
            relations: relations.map((relation) => ({
                relation_id: relation.id,
                student_id: relation.studentId,
                subject_id: relation.subjectId,
                student_name: relation.student.fullName,
                subject_name: relation.subject.name,
            })),
            durations,
            timezone: resolveTimezone(profile.timezone),
        };
    }

    async createLesson(
        user: SessionUser,
        input: CreateLessonDto,
    ): Promise<Record<string, unknown>> {
        this.requireTeacher(user);
        const topic = input.lesson_topic.trim();
        const notes = input.lesson_notes?.trim() || null;

        if (!topic) {
            throw new BadRequestException('Укажите тему урока');
        }

        return this.prisma.$transaction(async (transaction) => {
            const relation = await transaction.teacherStudent.findFirst({
                where: {
                    id: input.relation_id,
                    teacherId: user.id,
                    status: TeacherStudentStatus.ACTIVE,
                    student: {
                        role: UserRole.STUDENT,
                        status: UserStatus.ACTIVE,
                    },
                    subject: { isActive: true },
                },
                include: {
                    student: {
                        select: {
                            fullName: true,
                            studentProfile: { select: { timezone: true } },
                        },
                    },
                    subject: { select: { name: true } },
                    teacher: {
                        select: {
                            teacherProfile: {
                                select: {
                                    timezone: true,
                                    price45: true,
                                    price60: true,
                                    price90: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!relation) {
                throw new NotFoundException(
                    'Активная связь с учеником не найдена',
                );
            }

            const profile = relation.teacher.teacherProfile;

            if (!profile) {
                throw new NotFoundException('Профиль преподавателя не найден');
            }

            const selectedPrice = Number(
                input.duration_minutes === 45
                    ? profile.price45
                    : input.duration_minutes === 60
                        ? profile.price60
                        : profile.price90,
            );

            if (!Number.isFinite(selectedPrice) || selectedPrice <= 0) {
                throw new BadRequestException(
                    'Эта продолжительность не включена в анкете преподавателя',
                );
            }

            const timezone = resolveTimezone(profile.timezone);
            const localLessonDate = parseLocalDateTime(input.lesson_date);

            if (!localLessonDate) {
                throw new BadRequestException(
                    'Укажите корректные дату и время урока',
                );
            }

            const lessonDate = zonedDateTimeToUtc(localLessonDate, timezone);
            const now = new Date();
            const latestAllowedDate = new Date(now);

            latestAllowedDate.setUTCFullYear(latestAllowedDate.getUTCFullYear() + 1);

            if (lessonDate <= now) {
                throw new BadRequestException(
                    'Урок можно назначить только на будущее время',
                );
            }

            if (lessonDate > latestAllowedDate) {
                throw new BadRequestException(
                    'Урок нельзя назначить более чем на год вперёд',
                );
            }

            const lessonEnd = new Date(
                lessonDate.getTime() + input.duration_minutes * 60_000,
            );
            const conflictWindowStart = new Date(
                lessonDate.getTime()
                    - MAX_LESSON_DURATION_MINUTES * 60_000,
            );
            const possibleConflicts = await transaction.lesson.findMany({
                where: {
                    status: {
                        in: [
                            LessonStatus.SCHEDULED,
                            LessonStatus.RESCHEDULED,
                        ],
                    },
                    lessonDate: {
                        gte: conflictWindowStart,
                        lt: lessonEnd,
                    },
                    OR: [
                        { teacherId: user.id },
                        { studentId: relation.studentId },
                    ],
                },
                select: {
                    teacherId: true,
                    studentId: true,
                    lessonDate: true,
                    durationMinutes: true,
                },
            });
            const conflict = possibleConflicts.find((lesson) => {
                const existingEnd = lesson.lessonDate.getTime()
                    + lesson.durationMinutes * 60_000;

                return existingEnd > lessonDate.getTime();
            });

            if (conflict) {
                throw new ConflictException(
                    conflict.teacherId === user.id
                        ? 'У преподавателя уже есть занятие, пересекающееся по времени'
                        : 'У ученика уже есть занятие, пересекающееся по времени',
                );
            }

            const lesson = await transaction.lesson.create({
                data: {
                    teacherId: user.id,
                    studentId: relation.studentId,
                    subjectId: relation.subjectId,
                    title: relation.subject.name,
                    lessonDate,
                    durationMinutes: input.duration_minutes,
                    status: LessonStatus.SCHEDULED,
                    lessonTopic: topic,
                    lessonNotes: notes,
                },
            });
            const studentTimezone = resolveTimezone(
                relation.student.studentProfile?.timezone,
            );
            const studentLessonDate = formatInTimezone(
                lesson.lessonDate,
                studentTimezone,
            ) ?? input.lesson_date.replace('T', ' ');

            await this.notifications.create(transaction, {
                userId: relation.studentId,
                type: 'lesson_created',
                title: 'Назначен новый урок',
                message: `Преподаватель назначил занятие по предмету «${relation.subject.name}» на ${studentLessonDate}.`,
                targetSection: 'schedule',
                targetEntityType: 'lesson',
                targetEntityId: lesson.id,
                targetDate: studentLessonDate.slice(0, 10),
                dedupeKey: `lesson-created:${lesson.id}`,
            });

            return {
                success: true,
                message: 'Урок назначен',
                lesson: {
                    id: lesson.id,
                    teacher_id: lesson.teacherId,
                    student_id: lesson.studentId,
                    student_name: relation.student.fullName,
                    subject_id: lesson.subjectId,
                    subject_name: relation.subject.name,
                    lesson_date: formatInTimezone(lesson.lessonDate, timezone),
                    duration_minutes: lesson.durationMinutes,
                    status: lesson.status.toLowerCase(),
                    lesson_topic: lesson.lessonTopic,
                    lesson_notes: lesson.lessonNotes,
                },
            };
        }, {
            isolationLevel: 'Serializable',
        });
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Назначать уроки может только преподаватель',
            );
        }
    }
}
