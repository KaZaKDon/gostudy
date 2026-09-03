import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonStatus,
    TeacherStudentRequestStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { HomeworkService } from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import { formatInTimezone, resolveTimezone } from '../schedule/schedule-time';
import type { RespondStudentRequestDto } from './dto/respond-student-request.dto';
import type { UpdateStudentStatusDto } from './dto/update-student-status.dto';

const ACTIVE_LESSON_STATUSES = [
    LessonStatus.SCHEDULED,
    LessonStatus.RESCHEDULED,
];

@Injectable()
export class TeacherRelationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly homework: HomeworkService,
    ) {}

    async getTeacherStudents(user: SessionUser): Promise<Record<string, unknown>> {
        this.requireTeacher(user);
        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId: user.id },
            select: { timezone: true },
        });
        const timezone = resolveTimezone(profile?.timezone);
        const now = new Date();
        const [relations, requests, futureLessons] = await Promise.all([
            this.prisma.teacherStudent.findMany({
                where: {
                    teacherId: user.id,
                    status: {
                        in: [
                            TeacherStudentStatus.ACTIVE,
                            TeacherStudentStatus.ARCHIVED,
                        ],
                    },
                },
                include: {
                    student: {
                        select: {
                            fullName: true,
                            email: true,
                            phone: true,
                            studentProfile: true,
                        },
                    },
                    subject: { select: { name: true } },
                },
                orderBy: [
                    { status: 'asc' },
                    { student: { fullName: 'asc' } },
                ],
            }),
            this.prisma.teacherStudentRequest.findMany({
                where: {
                    teacherId: user.id,
                    status: TeacherStudentRequestStatus.PENDING,
                    student: {
                        role: UserRole.STUDENT,
                        status: UserStatus.ACTIVE,
                    },
                },
                include: {
                    student: {
                        select: {
                            fullName: true,
                            email: true,
                            phone: true,
                            studentProfile: true,
                        },
                    },
                    subject: { select: { name: true } },
                },
                orderBy: [
                    { createdAt: 'asc' },
                    { id: 'asc' },
                ],
            }),
            this.prisma.lesson.findMany({
                where: {
                    teacherId: user.id,
                    status: { in: ACTIVE_LESSON_STATUSES },
                    lessonDate: { gte: now },
                },
                orderBy: [{ lessonDate: 'asc' }, { id: 'asc' }],
                select: {
                    studentId: true,
                    subjectId: true,
                    lessonDate: true,
                },
            }),
        ]);
        const nextLessons = new Map<string, Date>();

        for (const lesson of futureLessons) {
            const key = `${lesson.studentId}:${lesson.subjectId ?? 0}`;
            if (!nextLessons.has(key)) {
                nextLessons.set(key, lesson.lessonDate);
            }
        }

        const students = {
            active: [] as Array<Record<string, unknown>>,
            archive: [] as Array<Record<string, unknown>>,
            requests: requests.map((request) => this.requestToApi(
                request,
                timezone,
            )),
        };

        for (const relation of relations) {
            const row = this.relationToApi(
                relation,
                timezone,
                nextLessons.get(
                    `${relation.studentId}:${relation.subjectId}`,
                ) ?? null,
            );

            if (relation.status === TeacherStudentStatus.ARCHIVED) {
                students.archive.push(row);
            } else {
                students.active.push(row);
            }
        }

        return { success: true, students };
    }

    async respondToRequest(
        user: SessionUser,
        input: RespondStudentRequestDto,
    ): Promise<Record<string, unknown>> {
        this.requireTeacher(user);

        return this.prisma.$transaction(async (transaction) => {
            const request = await transaction.teacherStudentRequest.findFirst({
                where: {
                    id: input.request_id,
                    teacherId: user.id,
                    student: {
                        role: UserRole.STUDENT,
                        status: UserStatus.ACTIVE,
                    },
                },
                include: { subject: { select: { name: true } } },
            });

            if (!request) {
                throw new NotFoundException('Заявка не найдена');
            }

            const targetStatus = input.action === 'accept'
                ? TeacherStudentRequestStatus.ACCEPTED
                : TeacherStudentRequestStatus.REJECTED;

            if (request.status === targetStatus) {
                return {
                    success: true,
                    message: input.action === 'accept'
                        ? 'Заявка уже принята'
                        : 'Заявка уже отклонена',
                    status: targetStatus.toLowerCase(),
                };
            }

            if (request.status !== TeacherStudentRequestStatus.PENDING) {
                throw new ConflictException('Заявка уже обработана');
            }

            if (input.action === 'accept') {
                const existing = await transaction.teacherStudent.findUnique({
                    where: {
                        teacherId_studentId_subjectId: {
                            teacherId: user.id,
                            studentId: request.studentId,
                            subjectId: request.subjectId,
                        },
                    },
                });
                const startedAt = existing?.startedAt ?? new Date();

                await transaction.teacherStudent.upsert({
                    where: {
                        teacherId_studentId_subjectId: {
                            teacherId: user.id,
                            studentId: request.studentId,
                            subjectId: request.subjectId,
                        },
                    },
                    update: {
                        status: TeacherStudentStatus.ACTIVE,
                        startedAt,
                        archivedAt: null,
                    },
                    create: {
                        teacherId: user.id,
                        studentId: request.studentId,
                        subjectId: request.subjectId,
                        startedAt,
                    },
                });
            }

            await transaction.teacherStudentRequest.update({
                where: { id: request.id },
                data: { status: targetStatus },
            });

            await this.notifications.markDedupeRead(
                transaction,
                user.id,
                `teacher-request:${request.id}`,
            );
            await this.notifications.create(transaction, {
                userId: request.studentId,
                type: input.action === 'accept'
                    ? 'teacher_request_accepted'
                    : 'teacher_request_rejected',
                title: input.action === 'accept'
                    ? 'Заявка принята'
                    : 'Заявка отклонена',
                message: input.action === 'accept'
                    ? `Преподаватель принял вашу заявку по предмету «${request.subject.name}».`
                    : `Преподаватель отклонил вашу заявку по предмету «${request.subject.name}».`,
                targetSection: 'teachers',
                targetEntityType: 'teacher_request',
                targetEntityId: request.id,
                dedupeKey: `teacher-request-response:${request.id}`,
            });

            return {
                success: true,
                message: input.action === 'accept'
                    ? 'Заявка принята, ученик добавлен'
                    : 'Заявка отклонена',
                status: targetStatus.toLowerCase(),
            };
        }, { isolationLevel: 'Serializable' });
    }

    async updateRelationStatus(
        user: SessionUser,
        input: UpdateStudentStatusDto,
    ): Promise<Record<string, unknown>> {
        this.requireTeacher(user);

        return this.prisma.$transaction(async (transaction) => {
            const relation = await transaction.teacherStudent.findFirst({
                where: { id: input.relation_id, teacherId: user.id },
            });

            if (!relation) {
                throw new NotFoundException('Связь с учеником не найдена');
            }

            const targetStatus = input.action === 'archive'
                ? TeacherStudentStatus.ARCHIVED
                : TeacherStudentStatus.ACTIVE;

            if (relation.status === targetStatus) {
                return {
                    success: true,
                    message: input.action === 'archive'
                        ? 'Обучение уже завершено'
                        : 'Обучение уже возобновлено',
                    status: targetStatus.toLowerCase(),
                };
            }

            if (input.action === 'archive') {
                const futureLessons = await transaction.lesson.count({
                    where: {
                        teacherId: user.id,
                        studentId: relation.studentId,
                        subjectId: relation.subjectId,
                        status: { in: ACTIVE_LESSON_STATUSES },
                        lessonDate: { gte: new Date() },
                    },
                });

                if (futureLessons > 0) {
                    throw new ConflictException(
                        'Сначала отмените будущие уроки с этим учеником',
                    );
                }
            }

            await transaction.teacherStudent.update({
                where: { id: relation.id },
                data: {
                    status: targetStatus,
                    archivedAt: input.action === 'archive' ? new Date() : null,
                    startedAt: input.action === 'restore'
                        ? relation.startedAt ?? new Date()
                        : relation.startedAt,
                },
            });

            return {
                success: true,
                message: input.action === 'archive'
                    ? 'Обучение завершено'
                    : 'Обучение возобновлено',
                status: targetStatus.toLowerCase(),
            };
        }, { isolationLevel: 'Serializable' });
    }

    async getStudentDetails(
        user: SessionUser,
        relationId: number,
        tab: string,
    ): Promise<Record<string, unknown>> {
        this.requireTeacher(user);
        const relation = await this.prisma.teacherStudent.findFirst({
            where: { id: relationId, teacherId: user.id },
            include: {
                student: { include: { studentProfile: true } },
                subject: true,
            },
        });

        if (!relation) {
            throw new NotFoundException('Связь с учеником не найдена');
        }

        const timezone = resolveTimezone(
            (await this.prisma.teacherProfile.findUnique({
                where: { userId: user.id },
                select: { timezone: true },
            }))?.timezone,
        );
        const lessonWhere = {
            teacherId: user.id,
            studentId: relation.studentId,
            subjectId: relation.subjectId,
        };

        if (tab === 'overview') {
            const [total, completed, nextLesson, homeworkStats] = await Promise.all([
                this.prisma.lesson.count({ where: lessonWhere }),
                this.prisma.lesson.count({
                    where: { ...lessonWhere, status: LessonStatus.COMPLETED },
                }),
                this.prisma.lesson.findFirst({
                    where: {
                        ...lessonWhere,
                        status: { in: ACTIVE_LESSON_STATUSES },
                        lessonDate: { gte: new Date() },
                    },
                    orderBy: { lessonDate: 'asc' },
                }),
                this.homework.getRelationStats(user, relation.id),
            ]);

            return {
                success: true,
                data: {
                    next_lesson_at: formatInTimezone(
                        nextLesson?.lessonDate ?? null,
                        timezone,
                    ),
                    lessons_completed: completed,
                    lessons_total: total,
                    homework_completed: homeworkStats.completed,
                    homework_total: homeworkStats.total,
                    notes: [],
                },
            };
        }

        if (tab === 'lessons') {
            const lessons = await this.prisma.lesson.findMany({
                where: lessonWhere,
                orderBy: [{ lessonDate: 'desc' }, { id: 'desc' }],
            });
            const homework = await this.homework.getLessonSummaries(
                lessons.map((lesson) => lesson.id),
            );

            return {
                success: true,
                data: {
                    items: lessons.map((lesson) => ({
                        id: lesson.id,
                        lesson_date: formatInTimezone(
                            lesson.lessonDate,
                            timezone,
                        ),
                        status: lesson.status.toLowerCase(),
                        topic: lesson.lessonTopic || lesson.title,
                        result: null,
                        grade: null,
                        duration_minutes: lesson.durationMinutes,
                        homework_title:
                            homework.get(lesson.id)?.latestHomeworkTitle
                            ?? null,
                    })),
                },
            };
        }

        if (tab === 'homework') {
            return {
                success: true,
                data: {
                    items: await this.homework.listForRelation(
                        user,
                        relation.id,
                    ),
                },
            };
        }

        if (tab === 'materials') {
            return {
                success: true,
                data: {
                    items: await this.homework.listAssignmentMaterialsForRelation(
                        user,
                        relation.id,
                    ),
                },
            };
        }

        if (tab === 'parents') {
            const profile = relation.student.studentProfile;
            return {
                success: true,
                data: {
                    name: profile?.parentName ?? null,
                    phone: profile?.parentPhone ?? null,
                    email: profile?.parentEmail ?? null,
                },
            };
        }

        if (tab === 'program') {
            return {
                success: true,
                data: {
                    items: [],
                    empty_message: 'Программа обучения пока не составлена.',
                    learning_goals:
                        relation.student.studentProfile?.learningGoals
                        ?? relation.student.studentProfile?.goal
                        ?? null,
                },
            };
        }

        if (tab === 'payments') {
            return {
                success: true,
                data: { items: [], empty_message: 'Платежей пока нет.' },
            };
        }

        return { success: true, data: { items: [] } };
    }

    async getStudentTeachers(user: SessionUser): Promise<Record<string, unknown>> {
        this.requireStudent(user);
        const relations = await this.prisma.teacherStudent.findMany({
            where: {
                studentId: user.id,
                status: {
                    in: [
                        TeacherStudentStatus.ACTIVE,
                        TeacherStudentStatus.ARCHIVED,
                    ],
                },
            },
            include: {
                teacher: { select: { fullName: true, avatarUrl: true } },
                subject: { select: { name: true } },
            },
            orderBy: [
                { status: 'asc' },
                { teacher: { fullName: 'asc' } },
            ],
        });
        const completed = await this.prisma.lesson.groupBy({
            by: ['teacherId', 'subjectId'],
            where: {
                studentId: user.id,
                status: LessonStatus.COMPLETED,
            },
            _count: { _all: true },
        });
        const counts = new Map(
            completed.map((item) => [
                `${item.teacherId}:${item.subjectId ?? 0}`,
                item._count._all,
            ]),
        );

        return {
            success: true,
            relations: relations.map((relation) => {
                const count = counts.get(
                    `${relation.teacherId}:${relation.subjectId}`,
                ) ?? 0;
                return {
                    relation_id: relation.id,
                    teacher_id: relation.teacherId,
                    teacher_name: relation.teacher.fullName,
                    teacher_photo_url: relation.teacher.avatarUrl,
                    subject_id: relation.subjectId,
                    subject_name: relation.subject.name,
                    relation_status: relation.status.toLowerCase(),
                    started_at: relation.startedAt,
                    completed_lessons_count: count,
                    can_review: false,
                    review: null,
                };
            }),
        };
    }

    private relationToApi(
        relation: any,
        timezone: string,
        nextLesson: Date | null,
    ): Record<string, unknown> {
        return {
            id: relation.id,
            student_id: relation.studentId,
            subject_id: relation.subjectId,
            status: relation.status.toLowerCase(),
            started_at: formatInTimezone(relation.startedAt, timezone),
            archived_at: formatInTimezone(relation.archivedAt, timezone),
            student_name: relation.student.fullName,
            student_email: relation.student.email,
            student_phone: relation.student.phone,
            ...this.studentProfileFields(relation.student.studentProfile),
            subject_name: relation.subject.name,
            next_lesson_at: formatInTimezone(nextLesson, timezone),
        };
    }

    private requestToApi(
        request: any,
        timezone: string,
    ): Record<string, unknown> {
        return {
            id: request.id,
            student_id: request.studentId,
            subject_id: request.subjectId,
            message: request.message,
            status: request.status.toLowerCase(),
            created_at: formatInTimezone(request.createdAt, timezone),
            student_name: request.student.fullName,
            student_email: request.student.email,
            student_phone: request.student.phone,
            ...this.studentProfileFields(request.student.studentProfile),
            subject_name: request.subject.name,
        };
    }

    private studentProfileFields(profile: any): Record<string, unknown> {
        return {
            class_level: profile?.classLevel ?? null,
            birth_year: profile?.birthYear ?? null,
            goal: profile?.goal ?? null,
            learning_goals: profile?.learningGoals ?? null,
            level_description: profile?.levelDescription ?? null,
            lesson_format: profile?.lessonFormat ?? null,
            preferred_time: profile?.preferredTime ?? null,
            schedule_comment: profile?.scheduleComment ?? null,
            parent_name: profile?.parentName ?? null,
            parent_phone: profile?.parentPhone ?? null,
            parent_email: profile?.parentEmail ?? null,
        };
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Раздел доступен только преподавателю',
            );
        }
    }

    private requireStudent(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT) {
            throw new ForbiddenException('Раздел доступен только ученику');
        }
    }
}
