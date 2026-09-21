import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { adultBirthDateCutoff } from '../../common/date/birth-date';
import type { Prisma } from '../../generated/prisma/client';
import {
    LessonStatus,
    ParentChildVerificationStatus,
    ParentStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import {
    HomeworkService,
    type HomeworkLessonSummary,
} from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
    formatInTimezone,
    resolveTimezone,
} from '../schedule/schedule-time';
import type { ListDiaryQueryDto } from './dto/list-diary-query.dto';
import type { ListJournalQueryDto } from './dto/list-journal-query.dto';
import type { SaveJournalResultDto } from './dto/save-journal-result.dto';
import {
    parseJournalCursor,
    type JournalCursor,
} from './journal-pagination';

const journalLessonInclude = {
    teacher: {
        select: {
            fullName: true,
        },
    },
    student: {
        select: {
            fullName: true,
            avatarUrl: true,
            studentProfile: {
                select: {
                    classLevel: true,
                    timezone: true,
                },
            },
        },
    },
    subject: {
        select: {
            name: true,
        },
    },
    result: true,
} satisfies Prisma.LessonInclude;

type JournalLessonRecord = Prisma.LessonGetPayload<{
    include: typeof journalLessonInclude;
}>;

type TeacherCourse = {
    student_id: number;
    subject_id: number;
    student_name: string;
    student_avatar_url: string | null;
    subject_name: string;
    class_level: string;
    lessons_count: number;
    pending_results_count: number;
};

type DiarySubject = {
    id: number;
    name: string;
    lessons_count: number;
    attended_count: number;
    average_grade: string | null;
};

type ParentDiaryChild = {
    studentId: number;
    fullName: string;
    timezone: string;
};

@Injectable()
export class JournalService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly homework: HomeworkService,
    ) {}

    async listTeacherJournal(
        user: SessionUser,
        query: ListJournalQueryDto,
    ) {
        this.requireTeacher(user);
        this.validateTeacherSelection(query);
        const timezone = await this.getViewerTimezone(user);
        const cursor = this.getCursor(
            query.before_date,
            query.before_id,
            timezone,
        );
        const courses = await this.loadTeacherCourses(user.id);
        let targetLesson: JournalLessonRecord | null = null;
        let studentId = query.student_id ?? null;
        let subjectId = query.subject_id ?? null;

        if (query.lesson_id) {
            targetLesson = await this.prisma.lesson.findFirst({
                where: {
                    id: query.lesson_id,
                    teacherId: user.id,
                    status: LessonStatus.COMPLETED,
                },
                include: journalLessonInclude,
            });

            if (!targetLesson) {
                throw new NotFoundException('Завершённый урок не найден');
            }
            if (!targetLesson.subjectId) {
                throw new ConflictException('У урока не указан предмет');
            }

            studentId = targetLesson.studentId;
            subjectId = targetLesson.subjectId;
        }

        if (studentId === null && courses.length) {
            studentId = courses[0].student_id;
            subjectId = courses[0].subject_id;
        }

        const activeCourse = courses.find((course) => (
            course.student_id === studentId
            && course.subject_id === subjectId
        )) ?? null;

        if (studentId !== null && !activeCourse) {
            throw new NotFoundException(
                'Записи выбранного ученика не найдены',
            );
        }

        const page = activeCourse
            ? await this.loadLessonPage({
                where: {
                    teacherId: user.id,
                    studentId: activeCourse.student_id,
                    subjectId: activeCourse.subject_id,
                    status: LessonStatus.COMPLETED,
                },
                cursor,
                limit: query.limit,
                timezone,
                includePrivateNote: true,
            })
            : this.emptyPage();

        const targetSummary = targetLesson
            ? (await this.homework.getLessonSummaries([targetLesson.id]))
                .get(targetLesson.id)
            : undefined;

        return {
            success: true,
            courses,
            active_course: activeCourse,
            lessons: page.lessons,
            target_lesson: targetLesson
                ? this.serializeLesson(
                    targetLesson,
                    timezone,
                    true,
                    targetSummary,
                )
                : null,
            has_more: page.hasMore,
            next_before_date: page.nextBeforeDate,
            next_before_id: page.nextBeforeId,
            timezone,
        };
    }

    async saveResult(user: SessionUser, input: SaveJournalResultDto) {
        this.requireTeacher(user);
        const grade = input.grade.trim();
        const lessonResult = input.lesson_result.trim();
        const teacherComment = input.teacher_comment.trim();
        const teacherNote = input.teacher_note.trim();

        if (input.attendance === 'absent' && grade) {
            throw new BadRequestException(
                'Отсутствующему ученику нельзя поставить оценку',
            );
        }
        if (input.attendance !== 'absent' && !lessonResult) {
            throw new BadRequestException('Опишите результат занятия');
        }

        const result = await this.prisma.$transaction(async (transaction) => {
            const lesson = await transaction.lesson.findFirst({
                where: {
                    id: input.lesson_id,
                    teacherId: user.id,
                },
                include: journalLessonInclude,
            });

            if (!lesson) {
                throw new NotFoundException('Урок не найден');
            }
            if (lesson.status !== LessonStatus.COMPLETED) {
                throw new ConflictException(
                    'Журнал можно заполнить только после завершения урока',
                );
            }

            const now = new Date();
            const wasPublished = Boolean(lesson.result?.publishedAt);
            await transaction.lessonResult.upsert({
                where: { lessonId: lesson.id },
                create: {
                    lessonId: lesson.id,
                    attendance: input.attendance,
                    grade: grade || null,
                    lessonResult: lessonResult || null,
                    teacherComment: teacherComment || null,
                    teacherNote: teacherNote || null,
                    publishedAt: now,
                },
                update: {
                    attendance: input.attendance,
                    grade: grade || null,
                    lessonResult: lessonResult || null,
                    teacherComment: teacherComment || null,
                    teacherNote: teacherNote || null,
                    publishedAt: lesson.result?.publishedAt ?? now,
                },
            });

            const studentTimezone = resolveTimezone(
                lesson.student.studentProfile?.timezone,
            );
            await this.notifications.create(transaction, {
                userId: lesson.studentId,
                type: wasPublished
                    ? 'lesson_result_updated'
                    : 'lesson_result_published',
                title: wasPublished
                    ? 'Результат занятия обновлён'
                    : 'Результат занятия опубликован',
                message: `${lesson.subject?.name || 'Занятие'}: ${this.lessonTopic(lesson)}`,
                targetSection: 'diary',
                targetEntityType: 'lesson',
                targetEntityId: lesson.id,
                targetDate: formatInTimezone(
                    lesson.lessonDate,
                    studentTimezone,
                )?.slice(0, 10) ?? null,
                dedupeKey: `lesson-result:${lesson.id}`,
            });
            await this.notifications.createForActiveParents(
                transaction,
                lesson.studentId,
                {
                    category: 'diary',
                    type: wasPublished
                        ? 'parent_lesson_result_updated'
                        : 'parent_lesson_result_published',
                    title: wasPublished
                        ? 'Результат занятия обновлён'
                        : 'Результат занятия опубликован',
                    message: `${lesson.subject?.name || 'Занятие'}: ${this.lessonTopic(lesson)}`,
                    targetSection: 'diary',
                    targetEntityType: 'lesson',
                    targetEntityId: lesson.id,
                    targetDate: formatInTimezone(
                        lesson.lessonDate,
                        studentTimezone,
                    )?.slice(0, 10) ?? null,
                    dedupeKey: `lesson-result:${lesson.id}`,
                },
            );

            return {
                wasPublished,
                lessonId: lesson.id,
            };
        });

        return {
            success: true,
            message: result.wasPublished
                ? 'Запись журнала обновлена'
                : 'Результат занятия опубликован',
            lesson_id: result.lessonId,
        };
    }

    async listStudentDiary(
        user: SessionUser,
        query: ListDiaryQueryDto,
    ) {
        this.requireStudent(user);
        const timezone = await this.getViewerTimezone(user);

        return this.listDiary(
            user,
            query,
            user.id,
            timezone,
        );
    }

    async listParentDiary(
        user: SessionUser,
        query: ListDiaryQueryDto,
    ) {
        this.requireParent(user);
        const context = await this.getParentDiaryContext(
            user,
            query.student_id,
            query.lesson_id,
        );

        return this.listDiary(
            user,
            query,
            context.selectedStudentId,
            context.timezone,
            context.children,
        );
    }

    private async listDiary(
        user: SessionUser,
        query: ListDiaryQueryDto,
        studentId: number,
        timezone: string,
        parentChildren: ParentDiaryChild[] | null = null,
    ) {
        const cursor = this.getCursor(
            query.before_date,
            query.before_id,
            timezone,
        );
        const publishedLessons = await this.prisma.lesson.findMany({
            where: {
                studentId,
                status: LessonStatus.COMPLETED,
                subjectId: { not: null },
                result: {
                    is: {
                        publishedAt: { not: null },
                    },
                },
            },
            include: journalLessonInclude,
        });
        const subjects = this.buildDiarySubjects(publishedLessons);
        let subjectId = query.subject_id ?? null;
        let targetLesson: JournalLessonRecord | null = null;

        if (query.lesson_id) {
            targetLesson = await this.prisma.lesson.findFirst({
                where: {
                    id: query.lesson_id,
                    studentId,
                    status: LessonStatus.COMPLETED,
                    result: {
                        is: {
                            publishedAt: { not: null },
                        },
                    },
                },
                include: journalLessonInclude,
            });

            if (!targetLesson?.subjectId) {
                throw new NotFoundException('Запись дневника не найдена');
            }

            subjectId = targetLesson.subjectId;
            if (user.role === UserRole.STUDENT) {
                await this.notifications.markDedupeRead(
                    this.prisma,
                    user.id,
                    `lesson-result:${targetLesson.id}`,
                );
            }
        }

        if (subjectId === null && subjects.length) {
            subjectId = subjects[0].id;
        }

        const activeSubject = subjects.find(
            (subject) => subject.id === subjectId,
        ) ?? null;

        if (subjectId !== null && !activeSubject) {
            throw new NotFoundException(
                'Записи выбранного предмета не найдены',
            );
        }

        const page = activeSubject
            ? await this.loadLessonPage({
                where: {
                    studentId,
                    subjectId: activeSubject.id,
                    status: LessonStatus.COMPLETED,
                    result: {
                        is: {
                            publishedAt: { not: null },
                        },
                    },
                },
                cursor,
                limit: query.limit,
                timezone,
                includePrivateNote: false,
            })
            : this.emptyPage();

        const targetSummary = targetLesson
            ? (await this.homework.getLessonSummaries([targetLesson.id]))
                .get(targetLesson.id)
            : undefined;

        return {
            success: true,
            subjects,
            active_subject: activeSubject,
            lessons: page.lessons,
            target_lesson: targetLesson
                ? this.serializeLesson(
                    targetLesson,
                    timezone,
                    false,
                    targetSummary,
                )
                : null,
            summary: this.buildDiarySummary(publishedLessons),
            has_more: page.hasMore,
            next_before_date: page.nextBeforeDate,
            next_before_id: page.nextBeforeId,
            timezone,
            ...(parentChildren
                ? {
                    children: parentChildren.map((child) => ({
                        student_id: child.studentId,
                        full_name: child.fullName,
                    })),
                    selected_student_id: studentId,
                    read_only: true,
                }
                : {}),
        };
    }

    private async getParentDiaryContext(
        user: SessionUser,
        requestedStudentId?: number,
        requestedLessonId?: number,
    ): Promise<{
        children: ParentDiaryChild[];
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
                studentId: child.studentId,
                fullName: [
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
                'Нет доступных записей несовершеннолетних детей',
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
                    status: LessonStatus.COMPLETED,
                    result: {
                        is: {
                            publishedAt: { not: null },
                        },
                    },
                },
                select: { studentId: true },
            });

            if (!targetLesson) {
                throw new ForbiddenException(
                    'Эта запись дневника недоступна родителю',
                );
            }

            selected = children.find(
                (child) => child.studentId === targetLesson.studentId,
            );
        }

        if (!selected) {
            throw new ForbiddenException(
                'Дневник этого ученика недоступен родителю',
            );
        }

        return {
            children,
            selectedStudentId: selected.studentId,
            timezone: selected.timezone,
        };
    }

    private async loadTeacherCourses(
        teacherId: number,
    ): Promise<TeacherCourse[]> {
        const lessons = await this.prisma.lesson.findMany({
            where: {
                teacherId,
                status: LessonStatus.COMPLETED,
                subjectId: { not: null },
            },
            include: journalLessonInclude,
        });
        const courses = new Map<string, TeacherCourse>();

        for (const lesson of lessons) {
            if (!lesson.subjectId) {
                continue;
            }

            const key = `${lesson.studentId}:${lesson.subjectId}`;
            const existing = courses.get(key);

            if (existing) {
                existing.lessons_count += 1;
                if (!lesson.result?.publishedAt) {
                    existing.pending_results_count += 1;
                }
                continue;
            }

            courses.set(key, {
                student_id: lesson.studentId,
                subject_id: lesson.subjectId,
                student_name: lesson.student.fullName || 'Ученик',
                student_avatar_url: lesson.student.avatarUrl,
                subject_name: lesson.subject?.name || 'Предмет',
                class_level: lesson.student.studentProfile?.classLevel || '',
                lessons_count: 1,
                pending_results_count: lesson.result?.publishedAt ? 0 : 1,
            });
        }

        return [...courses.values()].sort((left, right) => (
            left.student_name.localeCompare(right.student_name, 'ru')
            || left.subject_name.localeCompare(right.subject_name, 'ru')
        ));
    }

    private async loadLessonPage(input: {
        where: Prisma.LessonWhereInput;
        cursor: JournalCursor | null;
        limit: number;
        timezone: string;
        includePrivateNote: boolean;
    }) {
        const rows = await this.prisma.lesson.findMany({
            where: {
                ...input.where,
                ...(input.cursor
                    ? {
                        OR: [
                            { lessonDate: { lt: input.cursor.date } },
                            {
                                lessonDate: input.cursor.date,
                                id: { lt: input.cursor.id },
                            },
                        ],
                    }
                    : {}),
            },
            include: journalLessonInclude,
            orderBy: [
                { lessonDate: 'desc' },
                { id: 'desc' },
            ],
            take: input.limit + 1,
        });
        const hasMore = rows.length > input.limit;
        const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
        const last = hasMore ? pageRows.at(-1) : null;
        const homework = await this.homework.getLessonSummaries(
            pageRows.map((lesson) => lesson.id),
        );

        return {
            lessons: pageRows.map((lesson) => this.serializeLesson(
                lesson,
                input.timezone,
                input.includePrivateNote,
                homework.get(lesson.id),
            )),
            hasMore,
            nextBeforeDate: last
                ? formatInTimezone(last.lessonDate, input.timezone)
                : null,
            nextBeforeId: last?.id ?? null,
        };
    }

    private buildDiarySubjects(
        lessons: JournalLessonRecord[],
    ): DiarySubject[] {
        const subjects = new Map<number, {
            id: number;
            name: string;
            lessonsCount: number;
            attendedCount: number;
            numericGrades: number[];
        }>();

        for (const lesson of lessons) {
            if (!lesson.subjectId) {
                continue;
            }

            const current = subjects.get(lesson.subjectId) ?? {
                id: lesson.subjectId,
                name: lesson.subject?.name || 'Предмет',
                lessonsCount: 0,
                attendedCount: 0,
                numericGrades: [],
            };
            current.lessonsCount += 1;
            if (
                lesson.result?.attendance === 'present'
                || lesson.result?.attendance === 'late'
            ) {
                current.attendedCount += 1;
            }
            const numericGrade = this.numericGrade(lesson.result?.grade);
            if (numericGrade !== null) {
                current.numericGrades.push(numericGrade);
            }
            subjects.set(lesson.subjectId, current);
        }

        return [...subjects.values()]
            .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
            .map((subject) => ({
                id: subject.id,
                name: subject.name,
                lessons_count: subject.lessonsCount,
                attended_count: subject.attendedCount,
                average_grade: this.averageGrade(subject.numericGrades),
            }));
    }

    private buildDiarySummary(lessons: JournalLessonRecord[]) {
        const numericGrades = lessons
            .map((lesson) => this.numericGrade(lesson.result?.grade))
            .filter((grade): grade is number => grade !== null);

        return {
            lessons_count: lessons.length,
            attended_count: lessons.filter((lesson) => (
                lesson.result?.attendance === 'present'
                || lesson.result?.attendance === 'late'
            )).length,
            average_grade: this.averageGrade(numericGrades),
        };
    }

    private serializeLesson(
        lesson: JournalLessonRecord,
        timezone: string,
        includePrivateNote: boolean,
        homework?: HomeworkLessonSummary,
    ) {
        return {
            id: lesson.id,
            teacher_id: lesson.teacherId,
            student_id: lesson.studentId,
            subject_id: lesson.subjectId,
            student_name: lesson.student.fullName || 'Ученик',
            teacher_name: lesson.teacher.fullName || 'Преподаватель',
            subject_name: lesson.subject?.name || 'Предмет',
            lesson_date: formatInTimezone(lesson.lessonDate, timezone),
            duration_minutes: lesson.durationMinutes,
            status: lesson.status.toLowerCase(),
            topic: this.lessonTopic(lesson),
            lesson_notes: lesson.lessonNotes,
            attendance: lesson.result?.attendance ?? null,
            grade: lesson.result?.grade ?? null,
            lesson_result: lesson.result?.lessonResult ?? null,
            teacher_comment: lesson.result?.teacherComment ?? null,
            ...(includePrivateNote
                ? { teacher_note: lesson.result?.teacherNote ?? null }
                : {}),
            published_at: lesson.result?.publishedAt ?? null,
            is_published: Boolean(lesson.result?.publishedAt),
            homework_count: homework?.homeworkCount ?? 0,
            latest_homework_id: homework?.latestHomeworkId ?? null,
            latest_homework_title: homework?.latestHomeworkTitle ?? null,
            latest_homework_status: homework?.latestHomeworkStatus ?? null,
        };
    }

    private lessonTopic(lesson: JournalLessonRecord): string {
        return lesson.lessonTopic?.trim()
            || lesson.title?.trim()
            || 'Тема не указана';
    }

    private getCursor(
        date: string | undefined,
        id: number | undefined,
        timezone: string,
    ): JournalCursor | null {
        try {
            return parseJournalCursor(date, id, timezone);
        } catch (error) {
            throw new BadRequestException(
                error instanceof Error
                    ? error.message
                    : 'Некорректный указатель страницы',
            );
        }
    }

    private validateTeacherSelection(query: ListJournalQueryDto): void {
        if (
            (query.student_id === undefined)
            !== (query.subject_id === undefined)
        ) {
            throw new BadRequestException(
                'Ученик и предмет должны быть выбраны вместе',
            );
        }
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

    private numericGrade(value: string | null | undefined): number | null {
        return value && ['2', '3', '4', '5'].includes(value)
            ? Number(value)
            : null;
    }

    private averageGrade(values: number[]): string | null {
        if (!values.length) {
            return null;
        }

        const total = values.reduce((sum, value) => sum + value, 0);

        return (total / values.length).toFixed(1);
    }

    private emptyPage() {
        return {
            lessons: [],
            hasMore: false,
            nextBeforeDate: null,
            nextBeforeId: null,
        };
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Журнал доступен только преподавателю',
            );
        }
    }

    private requireStudent(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT) {
            throw new ForbiddenException(
                'Дневник доступен только ученику',
            );
        }
    }

    private requireParent(user: SessionUser): void {
        if (user.role !== UserRole.PARENT) {
            throw new ForbiddenException(
                'Дневник детей доступен только родителю',
            );
        }
    }
}
