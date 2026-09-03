import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ListAdminStudentsQueryDto } from './dto/list-admin-students-query.dto';

const STATUS_BY_VALUE: Record<string, UserStatus> = {
    active: UserStatus.ACTIVE,
    blocked: UserStatus.BLOCKED,
    archived: UserStatus.ARCHIVED,
    deleted: UserStatus.DELETED,
};

@Injectable()
export class AdminStudentsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(
        actor: SessionUser,
        query: ListAdminStudentsQueryDto,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const conditions: Prisma.UserWhereInput[] = [
            { role: UserRole.STUDENT },
        ];

        if (query.status) {
            conditions.push({ status: STATUS_BY_VALUE[query.status] });
        }

        if (search) {
            conditions.push({
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    {
                        studentProfile: {
                            is: {
                                OR: [
                                    { firstName: { contains: search, mode: 'insensitive' } },
                                    { lastName: { contains: search, mode: 'insensitive' } },
                                    { city: { contains: search, mode: 'insensitive' } },
                                    { subjects: { contains: search, mode: 'insensitive' } },
                                    { goal: { contains: search, mode: 'insensitive' } },
                                    { parentName: { contains: search, mode: 'insensitive' } },
                                    { parentPhone: { contains: search, mode: 'insensitive' } },
                                    { parentEmail: { contains: search, mode: 'insensitive' } },
                                ],
                            },
                        },
                    },
                ],
            });
        }

        const where: Prisma.UserWhereInput = { AND: conditions };
        const [total, students] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    studentProfile: true,
                    _count: {
                        select: {
                            learningRelations: {
                                where: { status: TeacherStudentStatus.ACTIVE },
                            },
                            learningRequests: true,
                            lessonsAsStudent: true,
                            homeworkReceived: true,
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: students.map((student) => this.listItem(student)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total > 0 ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async show(
        actor: SessionUser,
        studentId: number,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: {
                studentProfile: true,
                learningRelations: {
                    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phone: true,
                                status: true,
                            },
                        },
                        subject: true,
                    },
                },
                learningRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                status: true,
                            },
                        },
                        subject: true,
                    },
                },
                lessonsAsStudent: {
                    orderBy: { lessonDate: 'desc' },
                    take: 20,
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                            },
                        },
                        subject: true,
                    },
                },
                homeworkReceived: {
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    take: 20,
                    include: {
                        teacher: {
                            select: { id: true, fullName: true, email: true },
                        },
                        subject: { select: { id: true, name: true } },
                        submissions: {
                            orderBy: [
                                { attemptNumber: 'desc' },
                                { id: 'desc' },
                            ],
                            take: 1,
                        },
                    },
                },
                _count: {
                    select: {
                        learningRequests: true,
                        lessonsAsStudent: true,
                        homeworkReceived: true,
                    },
                },
            },
        });

        if (!student || student.role !== UserRole.STUDENT) {
            throw new NotFoundException('Ученик не найден');
        }

        const activeTeachersTotal = student.learningRelations.filter(
            (relation) => relation.status === TeacherStudentStatus.ACTIVE,
        ).length;

        return {
            success: true,
            data: {
                student: this.studentDetails(student),
                stats: {
                    teachers_total: activeTeachersTotal,
                    requests_total: student._count.learningRequests,
                    lessons_total: student._count.lessonsAsStudent,
                    homework_total: student._count.homeworkReceived ?? 0,
                    messages_total: 0,
                },
                teachers: student.learningRelations.map((relation) => ({
                    id: relation.id,
                    teacher_id: relation.teacher.id,
                    subject_id: relation.subject.id,
                    status: relation.status.toLowerCase(),
                    started_at: relation.startedAt,
                    archived_at: relation.archivedAt,
                    teacher_name: relation.teacher.fullName,
                    teacher_email: relation.teacher.email,
                    teacher_phone: relation.teacher.phone,
                    teacher_status: relation.teacher.status.toLowerCase(),
                    subject_name: relation.subject.name,
                    subject_slug: relation.subject.slug,
                })),
                requests: student.learningRequests.map((request) => ({
                    id: request.id,
                    teacher_id: request.teacher.id,
                    subject_id: request.subject.id,
                    message: request.message,
                    status: request.status.toLowerCase(),
                    created_at: request.createdAt,
                    updated_at: request.updatedAt,
                    teacher_name: request.teacher.fullName,
                    teacher_email: request.teacher.email,
                    teacher_status: request.teacher.status.toLowerCase(),
                    subject_name: request.subject.name,
                    subject_slug: request.subject.slug,
                })),
                lessons: student.lessonsAsStudent.map((lesson) => ({
                    id: lesson.id,
                    teacher_id: lesson.teacher.id,
                    subject_id: lesson.subject?.id ?? null,
                    title: lesson.title,
                    lesson_date: lesson.lessonDate,
                    duration_minutes: lesson.durationMinutes,
                    status: lesson.status.toLowerCase(),
                    lesson_topic: lesson.lessonTopic,
                    created_at: lesson.createdAt,
                    teacher_name: lesson.teacher.fullName,
                    teacher_email: lesson.teacher.email,
                    subject_name: lesson.subject?.name ?? null,
                    subject_slug: lesson.subject?.slug ?? null,
                })),
                homework: (student.homeworkReceived ?? []).map((homework) => {
                    const latest = homework.submissions[0] ?? null;

                    return {
                        id: homework.id,
                        teacher_id: homework.teacher.id,
                        subject_id: homework.subject.id,
                        teacher_name: homework.teacher.fullName,
                        teacher_email: homework.teacher.email,
                        subject_name: homework.subject.name,
                        title: homework.title,
                        status: homework.status.toLowerCase(),
                        submission_status: latest?.status.toLowerCase() ?? null,
                        grade: latest?.grade ?? null,
                        due_date: homework.dueDate,
                        created_at: homework.createdAt,
                    };
                }),
                profile_exists: Boolean(student.studentProfile),
                dependent_modules: {
                    homework: true,
                    messages: false,
                    parent_accounts: false,
                },
            },
        };
    }

    private listItem(student: Record<string, any>): Record<string, unknown> {
        const profile = student.studentProfile;

        return {
            id: student.id,
            full_name: student.fullName,
            email: student.email,
            phone: student.phone,
            status: student.status.toLowerCase(),
            blocked_reason: student.blockedReason,
            archive_reason: student.archiveReason,
            email_verified: Boolean(student.emailVerifiedAt),
            profile_completed: student.profileCompleted,
            last_login_at: student.lastLoginAt,
            created_at: student.createdAt,
            updated_at: student.updatedAt,
            profile_id: profile?.id ?? null,
            city: profile?.city ?? null,
            birth_year: profile?.birthYear ?? null,
            class_level: profile?.classLevel ?? null,
            subjects: profile?.subjects ?? null,
            goal: profile?.goal ?? null,
            parent_name: profile?.parentName ?? null,
            parent_phone: profile?.parentPhone ?? null,
            parent_email: profile?.parentEmail ?? null,
            profile_completion: profile?.profileCompletion ?? null,
            active_teachers_total: student._count.learningRelations,
            requests_total: student._count.learningRequests,
            lessons_total: student._count.lessonsAsStudent,
            homework_total: student._count.homeworkReceived ?? 0,
        };
    }

    private studentDetails(student: Record<string, any>): Record<string, unknown> {
        const profile = student.studentProfile;

        return {
            id: student.id,
            full_name: student.fullName,
            email: student.email,
            phone: student.phone,
            avatar_url: student.avatarUrl,
            status: student.status.toLowerCase(),
            blocked_reason: student.blockedReason,
            archived_at: student.archivedAt,
            archive_reason: student.archiveReason,
            email_verified: Boolean(student.emailVerifiedAt),
            email_verified_at: student.emailVerifiedAt,
            profile_completed: student.profileCompleted,
            last_login_at: student.lastLoginAt,
            created_at: student.createdAt,
            updated_at: student.updatedAt,
            profile_id: profile?.id ?? null,
            first_name: profile?.firstName ?? null,
            last_name: profile?.lastName ?? null,
            city: profile?.city ?? null,
            timezone: profile?.timezone ?? null,
            birth_year: profile?.birthYear ?? null,
            class_level: profile?.classLevel ?? null,
            subjects: profile?.subjects ?? null,
            goal: profile?.goal ?? null,
            learning_goals: profile?.learningGoals ?? null,
            level_description: profile?.levelDescription ?? null,
            lesson_format: profile?.lessonFormat ?? null,
            parent_name: profile?.parentName ?? null,
            parent_phone: profile?.parentPhone ?? null,
            parent_email: profile?.parentEmail ?? null,
            messenger: profile?.messenger ?? null,
            contact_preference: profile?.contactPreference ?? null,
            preferred_time: profile?.preferredTime ?? null,
            schedule_comment: profile?.scheduleComment ?? null,
            about: profile?.about ?? null,
            profile_version: profile?.profileVersion ?? null,
            profile_completion: profile?.profileCompletion ?? null,
            profile_created_at: profile?.createdAt ?? null,
            profile_updated_at: profile?.updatedAt ?? null,
        };
    }

    private requireModerator(actor: SessionUser): void {
        if (
            actor.role !== UserRole.ADMIN
            && actor.role !== UserRole.MODERATOR
        ) {
            throw new ForbiddenException(
                'Доступ разрешён только администратору или модератору',
            );
        }
    }
}
