import {
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    HomeworkStatus,
    HomeworkSubmissionStatus,
    LessonStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import {
    formatInTimezone,
    resolveTimezone,
} from '../schedule/schedule-time';

const DASHBOARD_LIMIT = 6;

type DashboardChild = {
    studentId: number;
    fullName: string;
    timezone: string;
};

@Injectable()
export class ParentDashboardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly parentChildAccess: ParentChildAccessService,
    ) {}

    async show(user: SessionUser) {
        if (user.role !== UserRole.PARENT) {
            throw new ForbiddenException(
                'Сводка детей доступна только родителю',
            );
        }

        const children = await this.loadChildren(user.id);
        const studentIds = children.map((child) => child.studentId);

        if (!studentIds.length) {
            return this.emptyDashboard();
        }

        const now = new Date();
        const upcomingWhere = {
            studentId: { in: studentIds },
            status: {
                in: [
                    LessonStatus.SCHEDULED,
                    LessonStatus.ACTIVE,
                    LessonStatus.RESCHEDULED,
                ],
            },
            OR: [
                { lessonDate: { gte: now } },
                { status: LessonStatus.ACTIVE },
            ],
        };
        const homeworkWhere = {
            studentId: { in: studentIds },
            status: HomeworkStatus.ACTIVE,
        };
        const [lessons, homework, diaryResults, lessonsCount, homeworkCount] =
            await Promise.all([
                this.prisma.lesson.findMany({
                    where: upcomingWhere,
                    orderBy: [{ lessonDate: 'asc' }, { id: 'asc' }],
                    take: DASHBOARD_LIMIT,
                    include: {
                        teacher: { select: { fullName: true } },
                        subject: { select: { name: true } },
                    },
                }),
                this.prisma.homework.findMany({
                    where: homeworkWhere,
                    orderBy: [
                        { dueDate: { sort: 'asc', nulls: 'last' } },
                        { createdAt: 'desc' },
                        { id: 'desc' },
                    ],
                    take: DASHBOARD_LIMIT,
                    include: {
                        teacher: { select: { fullName: true } },
                        subject: { select: { name: true } },
                        submissions: {
                            orderBy: [
                                { attemptNumber: 'desc' },
                                { id: 'desc' },
                            ],
                            take: 1,
                        },
                    },
                }),
                this.prisma.lessonResult.findMany({
                    where: {
                        publishedAt: { not: null },
                        lesson: {
                            studentId: { in: studentIds },
                            status: LessonStatus.COMPLETED,
                        },
                    },
                    orderBy: [
                        { publishedAt: 'desc' },
                        { id: 'desc' },
                    ],
                    take: DASHBOARD_LIMIT,
                    include: {
                        lesson: {
                            include: {
                                teacher: { select: { fullName: true } },
                                subject: { select: { name: true } },
                            },
                        },
                    },
                }),
                this.prisma.lesson.count({ where: upcomingWhere }),
                this.prisma.homework.count({ where: homeworkWhere }),
            ]);
        const childByStudentId = new Map(
            children.map((child) => [child.studentId, child]),
        );

        return {
            success: true,
            children: children.map((child) => ({
                student_id: child.studentId,
                full_name: child.fullName,
            })),
            summary: {
                children_count: children.length,
                upcoming_lessons_count: lessonsCount,
                active_homework_count: homeworkCount,
                recent_diary_count: diaryResults.length,
            },
            upcoming_lessons: lessons.flatMap((lesson) => {
                const child = childByStudentId.get(lesson.studentId);

                return child ? [{
                    id: lesson.id,
                    student_id: lesson.studentId,
                    child_name: child.fullName,
                    teacher_name: lesson.teacher.fullName || 'Преподаватель',
                    subject_name: lesson.subject?.name || 'Предмет',
                    title: lesson.title,
                    lesson_date: formatInTimezone(
                        lesson.lessonDate,
                        child.timezone,
                    ),
                    duration_minutes: lesson.durationMinutes,
                    status: lesson.status.toLowerCase(),
                }] : [];
            }),
            active_homework: homework.flatMap((item) => {
                const child = childByStudentId.get(item.studentId);
                const latest = item.submissions[0] ?? null;

                return child ? [{
                    id: item.id,
                    student_id: item.studentId,
                    child_name: child.fullName,
                    teacher_name: item.teacher.fullName || 'Преподаватель',
                    subject_name: item.subject.name,
                    title: item.title,
                    due_date: formatInTimezone(item.dueDate, child.timezone),
                    display_status: this.homeworkDisplayStatus(
                        item.dueDate,
                        latest?.status ?? null,
                    ),
                }] : [];
            }),
            recent_diary: diaryResults.flatMap((result) => {
                const child = childByStudentId.get(result.lesson.studentId);

                return child ? [{
                    lesson_id: result.lessonId,
                    student_id: result.lesson.studentId,
                    child_name: child.fullName,
                    teacher_name:
                        result.lesson.teacher.fullName || 'Преподаватель',
                    subject_name: result.lesson.subject?.name || 'Предмет',
                    topic: result.lesson.lessonTopic?.trim()
                        || result.lesson.title?.trim()
                        || 'Тема не указана',
                    lesson_date: formatInTimezone(
                        result.lesson.lessonDate,
                        child.timezone,
                    ),
                    attendance: result.attendance,
                    grade: result.grade,
                    published_at: result.publishedAt,
                }] : [];
            }),
        };
    }

    private async loadChildren(parentId: number): Promise<DashboardChild[]> {
        const children = await this.parentChildAccess
            .listCurrentMinorChildren(parentId);

        return children.map((child) => ({
            studentId: child.studentId,
            fullName: [
                child.lastName,
                child.firstName,
                child.middleName,
            ].filter(Boolean).join(' '),
            timezone: resolveTimezone(
                child.studentTimezone || child.timezone,
            ),
        }));
    }

    private homeworkDisplayStatus(
        dueDate: Date | null,
        submissionStatus: HomeworkSubmissionStatus | null,
    ): 'review' | 'late' | 'progress' {
        if (submissionStatus === HomeworkSubmissionStatus.SUBMITTED) {
            return 'review';
        }
        if (dueDate && dueDate.getTime() < Date.now()) {
            return 'late';
        }

        return 'progress';
    }

    private emptyDashboard() {
        return {
            success: true,
            children: [],
            summary: {
                children_count: 0,
                upcoming_lessons_count: 0,
                active_homework_count: 0,
                recent_diary_count: 0,
            },
            upcoming_lessons: [],
            active_homework: [],
            recent_diary: [],
        };
    }
}
