import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    TeacherStudentStatus,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { ListAdminTeachersQueryDto } from './dto/list-admin-teachers-query.dto';
import type { UpdateAdminTeacherVerificationDto } from './dto/update-admin-teacher-verification.dto';
import type { UpdateAdminTeacherVisibilityDto } from './dto/update-admin-teacher-visibility.dto';

const STATUS_BY_VALUE: Record<string, UserStatus> = {
    active: UserStatus.ACTIVE,
    blocked: UserStatus.BLOCKED,
    archived: UserStatus.ARCHIVED,
    deleted: UserStatus.DELETED,
};

const VERIFICATION_BY_VALUE: Record<string, TeacherVerificationStatus> = {
    pending: TeacherVerificationStatus.PENDING,
    verified: TeacherVerificationStatus.VERIFIED,
    rejected: TeacherVerificationStatus.REJECTED,
};

@Injectable()
export class AdminTeachersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async list(
        actor: SessionUser,
        query: ListAdminTeachersQueryDto,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const conditions: Prisma.UserWhereInput[] = [
            { role: UserRole.TEACHER },
        ];
        const profileFilter: Prisma.TeacherProfileWhereInput = {
            ...(query.verification_status
                ? {
                    verificationStatus:
                        VERIFICATION_BY_VALUE[query.verification_status],
                }
                : {}),
            ...(query.is_visible !== undefined
                ? { isVisible: query.is_visible === '1' }
                : {}),
        };

        if (query.status) {
            conditions.push({ status: STATUS_BY_VALUE[query.status] });
        }

        if (Object.keys(profileFilter).length > 0) {
            conditions.push({ teacherProfile: { is: profileFilter } });
        }

        if (search) {
            conditions.push({
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    {
                        teacherProfile: {
                            is: {
                                OR: [
                                    { firstName: { contains: search, mode: 'insensitive' } },
                                    { lastName: { contains: search, mode: 'insensitive' } },
                                    { city: { contains: search, mode: 'insensitive' } },
                                    { headline: { contains: search, mode: 'insensitive' } },
                                ],
                            },
                        },
                    },
                    {
                        teacherSubjects: {
                            some: {
                                subject: {
                                    name: { contains: search, mode: 'insensitive' },
                                },
                            },
                        },
                    },
                ],
            });
        }

        const where: Prisma.UserWhereInput = { AND: conditions };
        const [total, teachers] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    teacherProfile: true,
                    teacherSubjects: {
                        orderBy: { subject: { name: 'asc' } },
                        include: { subject: true },
                    },
                    _count: {
                        select: {
                            teachingRelations: {
                                where: { status: TeacherStudentStatus.ACTIVE },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: teachers.map((teacher) => this.listItem(teacher)),
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
        teacherId: number,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const teacher = await this.prisma.user.findUnique({
            where: { id: teacherId },
            include: {
                teacherProfile: {
                    include: {
                        verifiedBy: {
                            select: { id: true, fullName: true, email: true },
                        },
                    },
                },
                teacherSubjects: {
                    orderBy: { subject: { sortOrder: 'asc' } },
                    include: { subject: true },
                },
                teacherSubjectPreparations: {
                    include: {
                        subject: true,
                        preparation: { include: { group: true } },
                    },
                },
                teacherAgeGroups: {
                    orderBy: { ageGroup: { sortOrder: 'asc' } },
                    include: { ageGroup: true },
                },
                teacherEducation: {
                    orderBy: [
                        { isPrimary: 'desc' },
                        { sortOrder: 'asc' },
                        { id: 'asc' },
                    ],
                },
                teachingRelations: {
                    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
                    include: {
                        student: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phone: true,
                            },
                        },
                        subject: { select: { id: true, name: true } },
                    },
                },
                _count: {
                    select: {
                        lessonsAsTeacher: true,
                        homeworkAssigned: true,
                    },
                },
            },
        });

        if (!teacher || teacher.role !== UserRole.TEACHER) {
            throw new NotFoundException('Преподаватель не найден');
        }

        const profile = teacher.teacherProfile;
        const activeStudentsTotal = teacher.teachingRelations.filter(
            (relation) => relation.status === TeacherStudentStatus.ACTIVE,
        ).length;

        return {
            success: true,
            data: {
                teacher: this.teacherDetails(teacher),
                stats: {
                    active_students_total: activeStudentsTotal,
                    lessons_total: teacher._count.lessonsAsTeacher,
                    homework_total: teacher._count.homeworkAssigned ?? 0,
                    documents_total: 0,
                    pending_documents_total: 0,
                },
                subjects: teacher.teacherSubjects.map(({ subject }) => ({
                    id: subject.id,
                    name: subject.name,
                    slug: subject.slug,
                    is_active: subject.isActive,
                    sort_order: subject.sortOrder,
                })),
                subject_preparations: teacher.teacherSubjectPreparations.map(
                    ({ subject, preparation }) => ({
                        subject_id: subject.id,
                        subject_name: subject.name,
                        preparation_id: preparation.id,
                        preparation_name: preparation.name,
                        preparation_group_id: preparation.group.id,
                        preparation_group_name: preparation.group.name,
                    }),
                ),
                age_groups: teacher.teacherAgeGroups.map(({ ageGroup }) => ({
                    id: ageGroup.id,
                    name: ageGroup.name,
                    slug: ageGroup.slug,
                })),
                education: teacher.teacherEducation.map((item) => ({
                    id: item.id,
                    institution: item.institution,
                    faculty: item.faculty,
                    speciality: item.speciality,
                    qualification: item.qualification,
                    graduation_year: item.graduationYear,
                    description: item.description,
                    is_primary: item.isPrimary,
                })),
                documents: [],
                students: teacher.teachingRelations.map((relation) => ({
                    id: relation.id,
                    student_id: relation.student.id,
                    subject_id: relation.subject.id,
                    status: relation.status.toLowerCase(),
                    started_at: relation.startedAt,
                    archived_at: relation.archivedAt,
                    full_name: relation.student.fullName,
                    email: relation.student.email,
                    phone: relation.student.phone,
                    subject_name: relation.subject.name,
                })),
                reviews: [],
                media_migration_pending: true,
                profile_exists: Boolean(profile),
            },
        };
    }

    async updateVerification(
        actor: SessionUser,
        teacherId: number,
        input: UpdateAdminTeacherVerificationDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const status = VERIFICATION_BY_VALUE[input.status];
        const comment = input.comment?.trim() || '';

        if (status === TeacherVerificationStatus.REJECTED && !comment) {
            throw new BadRequestException('Укажите причину возврата на доработку');
        }

        const target = await this.prisma.user.findUnique({
            where: { id: teacherId },
            select: {
                id: true,
                role: true,
                status: true,
                teacherProfile: {
                    select: {
                        profileCompletion: true,
                        verificationStatus: true,
                        verificationComment: true,
                        isVisible: true,
                    },
                },
            },
        });

        if (!target || target.role !== UserRole.TEACHER) {
            throw new NotFoundException('Преподаватель не найден');
        }

        if (!target.teacherProfile) {
            throw new NotFoundException('Профиль преподавателя ещё не создан');
        }

        const currentProfile = target.teacherProfile;

        if (
            status === TeacherVerificationStatus.VERIFIED
            && currentProfile.profileCompletion < 100
        ) {
            throw new ConflictException(
                'Нельзя подтвердить незаполненную анкету преподавателя',
            );
        }

        if (
            status === TeacherVerificationStatus.VERIFIED
            && target.status !== UserStatus.ACTIVE
        ) {
            throw new ConflictException(
                'Сначала восстановите или разблокируйте аккаунт преподавателя',
            );
        }

        const isVerified = status === TeacherVerificationStatus.VERIFIED;
        const saved = await this.prisma.$transaction(async (transaction) => {
            const profile = await transaction.teacherProfile.update({
                where: { userId: teacherId },
                data: {
                    verificationStatus: status,
                    verificationComment: comment || null,
                    verifiedById: actor.id,
                    verifiedAt: isVerified ? new Date() : null,
                    isVisible: isVerified,
                },
            });

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: 'teacher_verification_updated',
                    entityType: 'teacher',
                    entityId: teacherId,
                    oldValue: {
                        verification_status:
                            currentProfile.verificationStatus.toLowerCase(),
                        verification_comment:
                            currentProfile.verificationComment,
                        is_visible: currentProfile.isVisible,
                    },
                    newValue: {
                        verification_status: status.toLowerCase(),
                        verification_comment: comment || null,
                        is_visible: isVerified,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            await this.notifications.create(transaction, {
                userId: teacherId,
                type: 'teacher_verification',
                title: isVerified
                    ? 'Анкета преподавателя подтверждена'
                    : status === TeacherVerificationStatus.REJECTED
                        ? 'Анкета возвращена на доработку'
                        : 'Статус проверки анкеты изменён',
                message: isVerified
                    ? 'Анкета прошла проверку и опубликована в поиске.'
                    : comment || 'Анкета ожидает повторной проверки.',
                targetSection: 'settings',
                targetEntityType: 'teacher_profile',
                targetEntityId: teacherId,
            });

            return profile;
        });

        return {
            success: true,
            message: isVerified
                ? 'Профиль преподавателя подтверждён и опубликован'
                : status === TeacherVerificationStatus.REJECTED
                    ? 'Профиль возвращён преподавателю на доработку'
                    : 'Профиль переведён на повторную проверку',
            data: {
                verification_status: saved.verificationStatus.toLowerCase(),
                verification_comment: saved.verificationComment,
                is_visible: saved.isVisible,
                verified_at: saved.verifiedAt,
            },
        };
    }

    async updateVisibility(
        actor: SessionUser,
        teacherId: number,
        input: UpdateAdminTeacherVisibilityDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const target = await this.prisma.user.findUnique({
            where: { id: teacherId },
            select: {
                id: true,
                role: true,
                status: true,
                teacherProfile: {
                    select: {
                        verificationStatus: true,
                        isVisible: true,
                    },
                },
            },
        });

        if (!target || target.role !== UserRole.TEACHER) {
            throw new NotFoundException('Преподаватель не найден');
        }

        if (!target.teacherProfile) {
            throw new NotFoundException('Профиль преподавателя ещё не создан');
        }

        const currentProfile = target.teacherProfile;

        if (
            input.is_visible
            && currentProfile.verificationStatus
                !== TeacherVerificationStatus.VERIFIED
        ) {
            throw new ConflictException(
                'Опубликовать можно только подтверждённую анкету',
            );
        }

        if (input.is_visible && target.status !== UserStatus.ACTIVE) {
            throw new ConflictException(
                'Опубликовать можно только активный аккаунт',
            );
        }

        const saved = await this.prisma.$transaction(async (transaction) => {
            const profile = await transaction.teacherProfile.update({
                where: { userId: teacherId },
                data: { isVisible: input.is_visible },
            });

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: 'teacher_visibility_updated',
                    entityType: 'teacher',
                    entityId: teacherId,
                    oldValue: { is_visible: currentProfile.isVisible },
                    newValue: { is_visible: input.is_visible },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            return profile;
        });

        return {
            success: true,
            message: saved.isVisible
                ? 'Анкета опубликована в поиске'
                : 'Анкета скрыта из поиска',
            data: { is_visible: saved.isVisible },
        };
    }

    private listItem(teacher: Record<string, any>): Record<string, unknown> {
        const profile = teacher.teacherProfile;

        return {
            id: teacher.id,
            full_name: teacher.fullName,
            email: teacher.email,
            phone: teacher.phone,
            status: teacher.status.toLowerCase(),
            blocked_reason: teacher.blockedReason,
            last_login_at: teacher.lastLoginAt,
            created_at: teacher.createdAt,
            updated_at: teacher.updatedAt,
            profile_id: profile?.id ?? null,
            city: profile?.city ?? null,
            headline: profile?.headline ?? null,
            experience_years: profile?.experienceYears ?? null,
            price_45: profile?.price45?.toString() ?? null,
            price_60: profile?.price60?.toString() ?? null,
            price_90: profile?.price90?.toString() ?? null,
            is_verified:
                profile?.verificationStatus === TeacherVerificationStatus.VERIFIED,
            is_visible: profile?.isVisible ?? null,
            rating: Number(profile?.rating ?? 0),
            reviews_count: profile?.reviewsCount ?? 0,
            verification_status:
                profile?.verificationStatus?.toLowerCase() ?? null,
            verification_comment: profile?.verificationComment ?? null,
            verified_at: profile?.verifiedAt ?? null,
            profile_completion: profile?.profileCompletion ?? null,
            subjects_text: teacher.teacherSubjects
                .map((link: Record<string, any>) => link.subject.name)
                .join(', '),
            documents_total: 0,
            pending_documents_total: 0,
            active_students_total: teacher._count.teachingRelations,
        };
    }

    private teacherDetails(teacher: Record<string, any>): Record<string, unknown> {
        const profile = teacher.teacherProfile;

        return {
            id: teacher.id,
            full_name: teacher.fullName,
            email: teacher.email,
            phone: teacher.phone,
            status: teacher.status.toLowerCase(),
            blocked_reason: teacher.blockedReason,
            archive_reason: teacher.archiveReason,
            photo_url: teacher.avatarUrl,
            last_login_at: teacher.lastLoginAt,
            created_at: teacher.createdAt,
            updated_at: teacher.updatedAt,
            profile_id: profile?.id ?? null,
            city: profile?.city ?? null,
            timezone: profile?.timezone ?? null,
            headline: profile?.headline ?? null,
            experience_years: profile?.experienceYears ?? null,
            about: profile?.about ?? null,
            teaching_method: profile?.teachingMethod ?? null,
            first_lesson_description: profile?.firstLessonDescription ?? null,
            student_gets: profile?.studentGets ?? null,
            price_45: profile?.price45?.toString() ?? null,
            price_60: profile?.price60?.toString() ?? null,
            price_90: profile?.price90?.toString() ?? null,
            trial_lesson_enabled: profile?.trialLessonEnabled ?? false,
            pricing_comment: profile?.pricingComment ?? null,
            schedule_description: profile?.scheduleDescription ?? null,
            accessibility_enabled: profile?.accessibilityEnabled ?? false,
            accessibility_free_lessons:
                profile?.accessibilityFreeLessons ?? false,
            accessibility_discount: profile?.accessibilityDiscount ?? false,
            accessibility_individual: profile?.accessibilityIndividual ?? false,
            accessibility_slots: profile?.accessibilitySlots ?? null,
            accessibility_comment: profile?.accessibilityComment ?? null,
            intro_video_url: profile?.introVideoUrl ?? null,
            uses_author_materials: profile?.usesAuthorMaterials ?? false,
            sells_author_materials: profile?.sellsAuthorMaterials ?? false,
            author_materials_description:
                profile?.authorMaterialsDescription ?? null,
            is_verified:
                profile?.verificationStatus === TeacherVerificationStatus.VERIFIED,
            is_visible: profile?.isVisible ?? null,
            rating: Number(profile?.rating ?? 0),
            reviews_count: profile?.reviewsCount ?? 0,
            verification_status:
                profile?.verificationStatus?.toLowerCase() ?? null,
            verification_comment: profile?.verificationComment ?? null,
            verified_by: profile?.verifiedById ?? null,
            verified_by_name:
                profile?.verifiedBy?.fullName || profile?.verifiedBy?.email || null,
            verified_at: profile?.verifiedAt ?? null,
            profile_completion: profile?.profileCompletion ?? null,
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
