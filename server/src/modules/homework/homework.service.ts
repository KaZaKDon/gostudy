import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { normalizeUploadedFileName } from '../../common/files/upload-file-name';
import { adultBirthDateCutoff } from '../../common/date/birth-date';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    HomeworkStatus,
    HomeworkSubmissionStatus,
    LessonStatus,
    ParentChildVerificationStatus,
    ParentStudentStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import {
    formatInTimezone,
    parseLocalDateTime,
    resolveTimezone,
    zonedDateTimeToUtc,
} from '../schedule/schedule-time';
import type { CreateHomeworkDto } from './dto/create-homework.dto';
import type { DownloadHomeworkFileQueryDto } from './dto/download-homework-file-query.dto';
import type { ReviewHomeworkDto } from './dto/review-homework.dto';
import type { SubmitHomeworkDto } from './dto/submit-homework.dto';
import {
    HomeworkFileStorageService,
    type HomeworkUploadFile,
} from './homework-file-storage.service';

const listHomeworkInclude = {
    teacher: { select: { fullName: true } },
    student: { select: { fullName: true } },
    subject: { select: { name: true } },
    submissions: {
        orderBy: [
            { attemptNumber: 'desc' as const },
            { id: 'desc' as const },
        ],
        take: 1,
    },
} satisfies Prisma.HomeworkInclude;

const homeworkDetailsInclude = {
    teacher: { select: { fullName: true } },
    student: { select: { fullName: true } },
    subject: { select: { name: true } },
    attachments: { orderBy: { id: 'asc' as const } },
    submissions: {
        orderBy: [
            { attemptNumber: 'desc' as const },
            { id: 'desc' as const },
        ],
        include: {
            attachments: { orderBy: { id: 'asc' as const } },
        },
    },
} satisfies Prisma.HomeworkInclude;

type HomeworkListRecord = Prisma.HomeworkGetPayload<{
    include: typeof listHomeworkInclude;
}>;

type HomeworkDetailsRecord = Prisma.HomeworkGetPayload<{
    include: typeof homeworkDetailsInclude;
}>;

export type HomeworkLessonSummary = {
    homeworkCount: number;
    latestHomeworkId: number | null;
    latestHomeworkTitle: string | null;
    latestHomeworkStatus: string | null;
};

@Injectable()
export class HomeworkService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly files: HomeworkFileStorageService,
    ) {}

    async list(user: SessionUser, requestedStudentId?: number) {
        this.requireViewer(user);
        const parentContext = user.role === UserRole.PARENT
            ? await this.getParentHomeworkContext(user, requestedStudentId)
            : null;
        const timezone = parentContext?.timezone
            ?? await this.getViewerTimezone(user);
        const rows = await this.prisma.homework.findMany({
            where: parentContext
                ? { studentId: parentContext.selectedStudentId }
                : this.participantWhere(user),
            include: listHomeworkInclude,
        });
        const homework = rows
            .map((item) => this.serializeListItem(item, timezone))
            .sort((left, right) => {
                const rank = {
                    review: 1,
                    late: 2,
                    progress: 3,
                    completed: 4,
                    cancelled: 5,
                } as const;
                const rankDifference = rank[left.display_status]
                    - rank[right.display_status];

                return rankDifference
                    || this.dateSortValue(left.due_date)
                    - this.dateSortValue(right.due_date)
                    || right.id - left.id;
            });

        return {
            success: true,
            homework,
            actionable_count: homework.filter((item) => (
                user.role === UserRole.TEACHER
                    ? item.display_status === 'review'
                    : user.role === UserRole.STUDENT
                        && item.status === 'active'
                        && (
                            !item.viewed_at
                            || item.submission_status === 'returned'
                        )
            )).length,
            timezone,
            upload_limits: this.serializeLimits(),
            ...(parentContext
                ? {
                    children: parentContext.children.map((child) => ({
                        student_id: child.student_id,
                        full_name: child.full_name,
                    })),
                    selected_student_id: parentContext.selectedStudentId,
                    read_only: true,
                }
                : {}),
        };
    }

    async show(user: SessionUser, homeworkId: number) {
        this.requireViewer(user);
        const parentContext = user.role === UserRole.PARENT
            ? await this.getParentHomeworkContext(user)
            : null;
        const homework = await this.prisma.homework.findFirst({
                where: {
                    id: homeworkId,
                    ...(parentContext
                        ? {
                            studentId: {
                                in: parentContext.children.map(
                                    (child) => child.student_id,
                                ),
                            },
                        }
                        : this.participantWhere(user)),
                },
                include: homeworkDetailsInclude,
            });

        if (!homework) {
            throw new NotFoundException('Домашнее задание не найдено');
        }

        const timezone = parentContext
            ? this.getParentChildTimezone(parentContext, homework.studentId)
            : await this.getViewerTimezone(user);

        await this.notifications.markEntityRead(
            this.prisma,
            user.id,
            'homework',
            homework.id,
        );

        return {
            success: true,
            homework: this.serializeDetails(homework, timezone),
        };
    }

    async options(user: SessionUser) {
        this.requireTeacher(user, 'Выдавать задания может только преподаватель');
        const timezone = await this.getViewerTimezone(user);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [relations, lessons] = await Promise.all([
            this.prisma.teacherStudent.findMany({
                where: {
                    teacherId: user.id,
                    status: TeacherStudentStatus.ACTIVE,
                    student: { status: UserStatus.ACTIVE },
                    subject: { isActive: true },
                },
                orderBy: [
                    { student: { fullName: 'asc' } },
                    { subject: { name: 'asc' } },
                ],
                include: {
                    student: { select: { fullName: true } },
                    subject: { select: { name: true } },
                },
            }),
            this.prisma.lesson.findMany({
                where: {
                    teacherId: user.id,
                    status: { not: LessonStatus.CANCELLED },
                    lessonDate: { gte: thirtyDaysAgo },
                    subjectId: { not: null },
                },
                orderBy: [
                    { lessonDate: 'desc' },
                    { id: 'desc' },
                ],
                take: 100,
                include: {
                    student: { select: { fullName: true } },
                    subject: { select: { name: true } },
                },
            }),
        ]);

        return {
            success: true,
            relations: relations.map((relation) => ({
                relation_id: relation.id,
                student_id: relation.studentId,
                subject_id: relation.subjectId,
                student_name: relation.student.fullName || 'Ученик',
                subject_name: relation.subject.name,
            })),
            lessons: lessons.map((lesson) => ({
                id: lesson.id,
                student_id: lesson.studentId,
                subject_id: lesson.subjectId,
                lesson_date: formatInTimezone(lesson.lessonDate, timezone),
                lesson_topic: lesson.lessonTopic,
                student_name: lesson.student.fullName || 'Ученик',
                subject_name: lesson.subject?.name || 'Предмет',
            })),
            timezone,
            minimum_due_hours: 24,
            max_files: this.files.limits().maxFiles,
            max_file_bytes: this.files.limits().maxFileBytes,
            max_total_bytes: this.files.limits().maxTotalBytes,
        };
    }

    async create(
        user: SessionUser,
        input: CreateHomeworkDto,
        uploads: HomeworkUploadFile[],
    ) {
        this.requireTeacher(user, 'Выдавать задания может только преподаватель');
        const title = input.title.trim();
        const description = input.description.trim();

        if (!title) {
            throw new BadRequestException('Укажите название задания');
        }
        if (!description) {
            throw new BadRequestException('Укажите описание задания');
        }

        const timezone = await this.getViewerTimezone(user);
        const dueDate = this.parseDueDate(input.due_date, timezone);
        const validated = this.files.validateUploads(uploads);
        let storedPaths: string[] = [];

        try {
            const homeworkId = await this.prisma.$transaction(
                async (transaction) => {
                    const relation = await transaction.teacherStudent.findFirst({
                        where: {
                            id: input.relation_id,
                            teacherId: user.id,
                            status: TeacherStudentStatus.ACTIVE,
                            student: { status: UserStatus.ACTIVE },
                            subject: { isActive: true },
                        },
                        include: {
                            student: { select: { fullName: true } },
                            subject: { select: { name: true } },
                        },
                    });

                    if (!relation) {
                        throw new NotFoundException(
                            'Активная связь с учеником не найдена',
                        );
                    }

                    if (input.lesson_id) {
                        const lesson = await transaction.lesson.findFirst({
                            where: {
                                id: input.lesson_id,
                                teacherId: user.id,
                                studentId: relation.studentId,
                                subjectId: relation.subjectId,
                                status: { not: LessonStatus.CANCELLED },
                            },
                            select: { id: true },
                        });

                        if (!lesson) {
                            throw new BadRequestException(
                                'Урок не соответствует выбранному ученику и предмету',
                            );
                        }
                    }

                    const homework = await transaction.homework.create({
                        data: {
                            teacherStudentId: relation.id,
                            lessonId: input.lesson_id ?? null,
                            teacherId: user.id,
                            studentId: relation.studentId,
                            subjectId: relation.subjectId,
                            title,
                            description,
                            dueDate,
                        },
                    });
                    const stored = await this.files.storeAssignment(
                        homework.id,
                        validated,
                    );
                    storedPaths = stored.map((file) => file.storedPath);

                    if (stored.length) {
                        await transaction.homeworkAttachment.createMany({
                            data: stored.map((file) => ({
                                homeworkId: homework.id,
                                storedPath: file.storedPath,
                                originalName: file.originalName,
                                mimeType: file.mimeType,
                                fileSize: file.fileSize,
                            })),
                        });
                    }

                    await this.notifications.create(transaction, {
                        userId: relation.studentId,
                        type: 'homework_assigned',
                        title: 'Новое домашнее задание',
                        message: `${relation.subject.name}: ${title}`,
                        targetSection: 'homework',
                        targetEntityType: 'homework',
                        targetEntityId: homework.id,
                        dedupeKey: `homework-assigned:${homework.id}`,
                    });
                    await this.notifications.createForActiveParents(
                        transaction,
                        relation.studentId,
                        {
                            category: 'homework',
                            type: 'parent_homework_assigned',
                            title: 'Новое домашнее задание',
                            message: `${relation.subject.name}: ${title}`,
                            targetSection: 'homework',
                            targetEntityType: 'homework',
                            targetEntityId: homework.id,
                            dedupeKey: `homework-assigned:${homework.id}`,
                        },
                    );

                    return homework.id;
                },
            );

            return {
                success: true,
                message: 'Домашнее задание выдано',
                homework_id: homeworkId,
            };
        } catch (error) {
            await this.files.removeStoredPaths(storedPaths);
            throw error;
        }
    }

    async submit(
        user: SessionUser,
        input: SubmitHomeworkDto,
        uploads: HomeworkUploadFile[],
    ) {
        this.requireStudent(user, 'Отправлять работу может только ученик');
        const answerText = input.answer_text.trim();
        const validated = this.files.validateUploads(uploads);

        if (!answerText && !validated.length) {
            throw new BadRequestException(
                'Напишите ответ или прикрепите файл',
            );
        }

        let storedPaths: string[] = [];

        try {
            const saved = await this.prisma.$transaction(async (transaction) => {
                const homework = await transaction.homework.findFirst({
                    where: {
                        id: input.homework_id,
                        studentId: user.id,
                    },
                    include: {
                        teacher: { select: { fullName: true } },
                        student: { select: { fullName: true } },
                        subject: { select: { name: true } },
                        submissions: {
                            orderBy: [
                                { attemptNumber: 'desc' },
                                { id: 'desc' },
                            ],
                            take: 1,
                        },
                    },
                });

                if (!homework) {
                    throw new NotFoundException(
                        'Домашнее задание не найдено',
                    );
                }
                if (homework.status !== HomeworkStatus.ACTIVE) {
                    throw new ConflictException(
                        'Это задание больше нельзя отправить',
                    );
                }

                const latest = homework.submissions[0] ?? null;
                if (latest?.status === HomeworkSubmissionStatus.SUBMITTED) {
                    throw new ConflictException(
                        'Работа уже отправлена и ожидает проверки',
                    );
                }
                if (latest?.status === HomeworkSubmissionStatus.ACCEPTED) {
                    throw new ConflictException('Работа уже принята');
                }

                const aggregate = await transaction.homeworkSubmission.aggregate({
                    where: { homeworkId: homework.id },
                    _max: { attemptNumber: true },
                });
                const attemptNumber = (aggregate._max.attemptNumber ?? 0) + 1;
                const submission = await transaction.homeworkSubmission.create({
                    data: {
                        homeworkId: homework.id,
                        studentId: user.id,
                        attemptNumber,
                        answerText: answerText || null,
                    },
                });
                const stored = await this.files.storeSubmission(
                    homework.id,
                    attemptNumber,
                    validated,
                );
                storedPaths = stored.map((file) => file.storedPath);

                if (stored.length) {
                    await transaction.homeworkSubmissionAttachment.createMany({
                        data: stored.map((file) => ({
                            submissionId: submission.id,
                            storedPath: file.storedPath,
                            originalName: file.originalName,
                            mimeType: file.mimeType,
                            fileSize: file.fileSize,
                        })),
                    });
                }

                await this.notifications.create(transaction, {
                    userId: homework.teacherId,
                    type: 'homework_submitted',
                    title: 'Домашняя работа отправлена',
                    message: `${homework.student.fullName || 'Ученик'}: ${homework.title}`,
                    targetSection: 'homework',
                    targetEntityType: 'homework',
                    targetEntityId: homework.id,
                    dedupeKey: `homework-submitted:${homework.id}:${attemptNumber}`,
                });

                return {
                    submissionId: submission.id,
                    attemptNumber,
                };
            });

            return {
                success: true,
                message: 'Работа отправлена преподавателю',
                submission_id: saved.submissionId,
                attempt_number: saved.attemptNumber,
            };
        } catch (error) {
            await this.files.removeStoredPaths(storedPaths);
            throw error;
        }
    }

    async review(user: SessionUser, input: ReviewHomeworkDto) {
        this.requireTeacher(user, 'Проверять работу может только преподаватель');
        const grade = input.grade.trim();
        const comment = input.teacher_comment.trim();

        if (input.decision === 'returned' && !comment) {
            throw new BadRequestException('Укажите, что нужно доработать');
        }

        await this.prisma.$transaction(async (transaction) => {
            const homework = await transaction.homework.findFirst({
                where: {
                    id: input.homework_id,
                    teacherId: user.id,
                },
                include: {
                    subject: { select: { name: true } },
                    submissions: {
                        orderBy: [
                            { attemptNumber: 'desc' },
                            { id: 'desc' },
                        ],
                        take: 1,
                    },
                },
            });

            if (!homework) {
                throw new NotFoundException('Домашнее задание не найдено');
            }
            if (homework.status !== HomeworkStatus.ACTIVE) {
                throw new ConflictException('Задание уже закрыто');
            }

            const submission = homework.submissions[0] ?? null;
            if (submission?.status !== HomeworkSubmissionStatus.SUBMITTED) {
                throw new ConflictException(
                    'Нет отправленной работы для проверки',
                );
            }

            const accepted = input.decision === 'accepted';
            await transaction.homeworkSubmission.update({
                where: { id: submission.id },
                data: {
                    status: accepted
                        ? HomeworkSubmissionStatus.ACCEPTED
                        : HomeworkSubmissionStatus.RETURNED,
                    grade: grade || null,
                    teacherComment: comment || null,
                    reviewedAt: new Date(),
                },
            });

            if (accepted) {
                await transaction.homework.update({
                    where: { id: homework.id },
                    data: {
                        status: HomeworkStatus.COMPLETED,
                        completedAt: new Date(),
                    },
                });
            }

            await this.notifications.create(transaction, {
                userId: homework.studentId,
                type: accepted ? 'homework_accepted' : 'homework_returned',
                title: accepted
                    ? 'Домашняя работа принята'
                    : 'Домашняя работа требует доработки',
                message: `${homework.subject.name}: ${homework.title}`,
                targetSection: 'homework',
                targetEntityType: 'homework',
                targetEntityId: homework.id,
                dedupeKey: `homework-review:${submission.id}`,
            });
            await this.notifications.createForActiveParents(
                transaction,
                homework.studentId,
                {
                    category: 'homework',
                    type: accepted
                        ? 'parent_homework_accepted'
                        : 'parent_homework_returned',
                    title: accepted
                        ? 'Домашняя работа принята'
                        : 'Домашняя работа требует доработки',
                    message: `${homework.subject.name}: ${homework.title}`,
                    targetSection: 'homework',
                    targetEntityType: 'homework',
                    targetEntityId: homework.id,
                    dedupeKey: `homework-review:${submission.id}`,
                },
            );
        });

        return {
            success: true,
            message: input.decision === 'accepted'
                ? 'Работа принята'
                : 'Работа возвращена на доработку',
        };
    }

    async cancel(user: SessionUser, homeworkId: number) {
        this.requireTeacher(user, 'Отменить задание может только преподаватель');

        await this.prisma.$transaction(async (transaction) => {
            const homework = await transaction.homework.findFirst({
                where: {
                    id: homeworkId,
                    teacherId: user.id,
                },
                include: {
                    subject: { select: { name: true } },
                    _count: { select: { submissions: true } },
                },
            });

            if (!homework) {
                throw new NotFoundException('Домашнее задание не найдено');
            }
            if (homework.status !== HomeworkStatus.ACTIVE) {
                throw new ConflictException('Задание уже закрыто');
            }
            if (homework._count.submissions > 0) {
                throw new ConflictException(
                    'Задание с отправленными попытками нельзя отменить',
                );
            }

            await transaction.homework.update({
                where: { id: homework.id },
                data: {
                    status: HomeworkStatus.CANCELLED,
                    cancelledAt: new Date(),
                },
            });
            await this.notifications.create(transaction, {
                userId: homework.studentId,
                type: 'homework_cancelled',
                title: 'Домашнее задание отменено',
                message: `${homework.subject.name}: ${homework.title}`,
                targetSection: 'homework',
                targetEntityType: 'homework',
                targetEntityId: homework.id,
                dedupeKey: `homework-cancelled:${homework.id}`,
            });
            await this.notifications.createForActiveParents(
                transaction,
                homework.studentId,
                {
                    category: 'homework',
                    type: 'parent_homework_cancelled',
                    title: 'Домашнее задание отменено',
                    message: `${homework.subject.name}: ${homework.title}`,
                    targetSection: 'homework',
                    targetEntityType: 'homework',
                    targetEntityId: homework.id,
                    dedupeKey: `homework-cancelled:${homework.id}`,
                },
            );
        });

        return {
            success: true,
            message: 'Домашнее задание отменено',
        };
    }

    async markViewed(user: SessionUser, homeworkId: number) {
        this.requireStudent(user, 'Отметить просмотр может только ученик');
        const homework = await this.prisma.homework.findFirst({
            where: { id: homeworkId, studentId: user.id },
            select: { id: true, viewedAt: true },
        });

        if (!homework) {
            throw new NotFoundException('Домашнее задание не найдено');
        }

        if (!homework.viewedAt) {
            await this.prisma.homework.update({
                where: { id: homework.id },
                data: { viewedAt: new Date() },
            });
        }
        await this.notifications.markEntityRead(
            this.prisma,
            user.id,
            'homework',
            homework.id,
        );

        return {
            success: true,
            message: 'Просмотр отмечен',
        };
    }

    async download(
        user: SessionUser,
        query: DownloadHomeworkFileQueryDto,
    ) {
        this.requireViewer(user);
        if (query.type === 'assignment') {
            const file = await this.prisma.homeworkAttachment.findUnique({
                where: { id: query.id },
                include: { homework: true },
            });

            if (!file || !await this.canAccess(user, file.homework)) {
                throw new NotFoundException('Файл не найден');
            }

            return this.prepareDownload(file);
        }

        const file = await this.prisma.homeworkSubmissionAttachment.findUnique({
            where: { id: query.id },
            include: {
                submission: {
                    include: { homework: true },
                },
            },
        });

        if (
            !file
            || !await this.canAccess(user, file.submission.homework)
        ) {
            throw new NotFoundException('Файл не найден');
        }

        return this.prepareDownload(file);
    }

    private async prepareDownload(file: {
        storedPath: string;
        originalName: string;
        mimeType: string;
    }) {
        const stored = await this.files.readStoredFile(file.storedPath);

        return {
            absolutePath: stored.absolutePath,
            size: stored.size,
            originalName: normalizeUploadedFileName(file.originalName),
            mimeType: file.mimeType,
        };
    }

    async listForLesson(user: SessionUser, lessonId: number) {
        this.requireParticipant(user);
        const timezone = await this.getViewerTimezone(user);
        const rows = await this.prisma.homework.findMany({
            where: {
                lessonId,
                status: { not: HomeworkStatus.CANCELLED },
                ...this.participantWhere(user),
            },
            include: listHomeworkInclude,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        return rows.map((item) => ({
            ...this.serializeListItem(item, timezone),
            description: item.description,
        }));
    }

    async listForRelation(user: SessionUser, relationId: number) {
        this.requireTeacher(user, 'История заданий доступна преподавателю');
        const timezone = await this.getViewerTimezone(user);
        const rows = await this.prisma.homework.findMany({
            where: {
                teacherStudentId: relationId,
                teacherId: user.id,
            },
            include: listHomeworkInclude,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        return rows.map((item) => this.serializeListItem(item, timezone));
    }

    async getRelationStats(user: SessionUser, relationId: number) {
        this.requireTeacher(user, 'Статистика доступна преподавателю');
        const where = {
            teacherStudentId: relationId,
            teacherId: user.id,
        };
        const [total, completed] = await Promise.all([
            this.prisma.homework.count({ where }),
            this.prisma.homework.count({
                where: { ...where, status: HomeworkStatus.COMPLETED },
            }),
        ]);

        return { total, completed };
    }

    async listAssignmentMaterialsForRelation(
        user: SessionUser,
        relationId: number,
    ) {
        this.requireTeacher(user, 'Материалы доступны преподавателю');
        const timezone = await this.getViewerTimezone(user);
        const rows = await this.prisma.homeworkAttachment.findMany({
            where: {
                homework: {
                    teacherStudentId: relationId,
                    teacherId: user.id,
                },
            },
            include: {
                homework: { select: { id: true, title: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        return rows.map((file) => ({
            id: `homework:${file.id}`,
            source_type: 'homework',
            source_id: file.homework.id,
            source_title: file.homework.title,
            file_id: file.id,
            original_name: normalizeUploadedFileName(file.originalName),
            mime_type: file.mimeType,
            file_size: file.fileSize,
            created_at: formatInTimezone(file.createdAt, timezone),
        }));
    }

    async getLessonSummaries(
        lessonIds: number[],
    ): Promise<Map<number, HomeworkLessonSummary>> {
        const uniqueIds = [...new Set(lessonIds)].filter((id) => id > 0);
        const summaries = new Map<number, HomeworkLessonSummary>();

        if (!uniqueIds.length) {
            return summaries;
        }

        const rows = await this.prisma.homework.findMany({
            where: {
                lessonId: { in: uniqueIds },
                status: { not: HomeworkStatus.CANCELLED },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        for (const homework of rows) {
            if (!homework.lessonId) {
                continue;
            }

            const current = summaries.get(homework.lessonId);
            if (current) {
                current.homeworkCount += 1;
                continue;
            }

            summaries.set(homework.lessonId, {
                homeworkCount: 1,
                latestHomeworkId: homework.id,
                latestHomeworkTitle: homework.title,
                latestHomeworkStatus: this.learningHomeworkStatus(homework),
            });
        }

        return summaries;
    }

    private serializeListItem(
        homework: HomeworkListRecord,
        timezone: string,
    ) {
        const latest = homework.submissions[0] ?? null;

        return {
            id: homework.id,
            lesson_id: homework.lessonId,
            teacher_id: homework.teacherId,
            student_id: homework.studentId,
            subject_id: homework.subjectId,
            teacher_name: homework.teacher.fullName || 'Преподаватель',
            student_name: homework.student.fullName || 'Ученик',
            subject_name: homework.subject.name,
            title: homework.title,
            due_date: formatInTimezone(homework.dueDate, timezone),
            status: homework.status.toLowerCase(),
            viewed_at: formatInTimezone(homework.viewedAt, timezone),
            completed_at: formatInTimezone(homework.completedAt, timezone),
            cancelled_at: formatInTimezone(homework.cancelledAt, timezone),
            submission_id: latest?.id ?? null,
            submission_status: latest?.status.toLowerCase() ?? null,
            attempt_number: latest?.attemptNumber ?? null,
            grade: latest?.grade ?? null,
            teacher_comment: latest?.teacherComment ?? null,
            display_status: this.displayStatus(homework, latest),
            created_at: formatInTimezone(homework.createdAt, timezone),
        };
    }

    private serializeDetails(
        homework: HomeworkDetailsRecord,
        timezone: string,
    ) {
        const latest = homework.submissions[0] ?? null;

        return {
            ...this.serializeListItem({
                ...homework,
                submissions: latest ? [latest] : [],
            }, timezone),
            description: homework.description,
            attachments: homework.attachments.map(
                (file) => this.serializeFile(file, timezone),
            ),
            submissions: homework.submissions.map((submission) => ({
                id: submission.id,
                attempt_number: submission.attemptNumber,
                answer_text: submission.answerText,
                status: submission.status.toLowerCase(),
                grade: submission.grade,
                teacher_comment: submission.teacherComment,
                submitted_at: formatInTimezone(
                    submission.submittedAt,
                    timezone,
                ),
                reviewed_at: formatInTimezone(
                    submission.reviewedAt,
                    timezone,
                ),
                attachments: submission.attachments.map(
                    (file) => this.serializeFile(file, timezone),
                ),
            })),
        };
    }

    private serializeFile(file: {
        id: number;
        originalName: string;
        mimeType: string;
        fileSize: number;
        createdAt: Date;
    }, timezone: string) {
        return {
            id: file.id,
            original_name: normalizeUploadedFileName(file.originalName),
            mime_type: file.mimeType,
            file_size: file.fileSize,
            created_at: formatInTimezone(file.createdAt, timezone),
        };
    }

    private displayStatus(
        homework: { status: HomeworkStatus; dueDate: Date | null },
        latest: { status: HomeworkSubmissionStatus } | null,
    ): 'review' | 'late' | 'progress' | 'completed' | 'cancelled' {
        if (homework.status === HomeworkStatus.CANCELLED) return 'cancelled';
        if (homework.status === HomeworkStatus.COMPLETED) return 'completed';
        if (latest?.status === HomeworkSubmissionStatus.SUBMITTED) return 'review';
        if (homework.dueDate && homework.dueDate.getTime() < Date.now()) {
            return 'late';
        }

        return 'progress';
    }

    private learningHomeworkStatus(homework: {
        status: HomeworkStatus;
        dueDate: Date | null;
    }): string {
        if (homework.status === HomeworkStatus.COMPLETED) return 'completed';
        if (
            homework.status === HomeworkStatus.ACTIVE
            && homework.dueDate
            && homework.dueDate.getTime() < Date.now()
        ) {
            return 'expired';
        }

        return 'active';
    }

    private parseDueDate(
        value: string | undefined,
        timezone: string,
    ): Date | null {
        if (!value) {
            return null;
        }

        const parts = parseLocalDateTime(value);
        if (!parts) {
            throw new BadRequestException(
                'Укажите корректные дату и время сдачи',
            );
        }

        const dueDate = zonedDateTimeToUtc(parts, timezone);
        if (dueDate.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
            throw new BadRequestException(
                'На выполнение задания нужно дать не менее 24 часов',
            );
        }

        return dueDate;
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

    private async getParentHomeworkContext(
        user: SessionUser,
        requestedStudentId?: number,
    ): Promise<{
        children: Array<{
            student_id: number;
            full_name: string;
            timezone: string;
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

        if (!linkedStudentIds.length) {
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
                student_id: child.studentId,
                full_name: [
                    child.lastName,
                    child.firstName,
                    child.middleName,
                ].filter(Boolean).join(' '),
                timezone: resolveTimezone(
                    child.student?.studentProfile?.timezone
                    || child.timezone,
                ),
            }];
        });

        if (!children.length) {
            throw new BadRequestException(
                'Нет доступных заданий несовершеннолетних детей',
            );
        }

        const selected = requestedStudentId
            ? children.find((child) => (
                child.student_id === requestedStudentId
            ))
            : children[0];

        if (!selected) {
            throw new ForbiddenException(
                'Домашние задания этого ученика недоступны родителю',
            );
        }

        return {
            children,
            selectedStudentId: selected.student_id,
            timezone: selected.timezone,
        };
    }

    private getParentChildTimezone(
        context: {
            children: Array<{ student_id: number; timezone: string }>;
            timezone: string;
        },
        studentId: number,
    ): string {
        return context.children.find(
            (child) => child.student_id === studentId,
        )?.timezone || context.timezone;
    }

    private participantWhere(user: SessionUser): Prisma.HomeworkWhereInput {
        return user.role === UserRole.TEACHER
            ? { teacherId: user.id }
            : { studentId: user.id };
    }

    private async canAccess(
        user: SessionUser,
        homework: { teacherId: number; studentId: number },
    ): Promise<boolean> {
        if (user.role === UserRole.TEACHER) {
            return homework.teacherId === user.id;
        }

        if (user.role === UserRole.STUDENT) {
            return homework.studentId === user.id;
        }

        try {
            await this.getParentHomeworkContext(user, homework.studentId);
            return true;
        } catch {
            return false;
        }
    }

    private serializeLimits() {
        const limits = this.files.limits();

        return {
            max_files: limits.maxFiles,
            max_file_bytes: limits.maxFileBytes,
            max_total_bytes: limits.maxTotalBytes,
        };
    }

    private dateSortValue(value: string | null): number {
        if (!value) {
            return Number.MAX_SAFE_INTEGER;
        }

        const timestamp = new Date(value.replace(' ', 'T')).getTime();

        return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
    }

    private requireParticipant(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER && user.role !== UserRole.STUDENT) {
            throw new ForbiddenException(
                'Домашние задания недоступны для этой роли',
            );
        }
    }

    private requireViewer(user: SessionUser): void {
        if (
            user.role !== UserRole.TEACHER
            && user.role !== UserRole.STUDENT
            && user.role !== UserRole.PARENT
        ) {
            throw new ForbiddenException(
                'Домашние задания недоступны для этой роли',
            );
        }
    }

    private requireTeacher(user: SessionUser, message: string): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(message);
        }
    }

    private requireStudent(user: SessionUser, message: string): void {
        if (user.role !== UserRole.STUDENT) {
            throw new ForbiddenException(message);
        }
    }
}
