import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    AccessibilityApplicationStatus,
    AccessibilityOfferStatus,
    ParentChildVerificationStatus,
    ParentStudentStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateAccessibilityApplicationDto } from './dto/create-accessibility-application.dto';
import type { RespondAccessibilityApplicationDto } from './dto/respond-accessibility-application.dto';

const RESERVED_STATUSES = [
    AccessibilityApplicationStatus.ACCEPTED,
    AccessibilityApplicationStatus.CONFIRMED,
];

const applicationInclude = {
    offer: { select: { offerType: true } },
    teacher: { select: { fullName: true } },
    student: { select: { fullName: true } },
    submittedBy: { select: { fullName: true, role: true } },
    subject: { select: { name: true } },
} satisfies Prisma.AccessibilityApplicationInclude;

@Injectable()
export class AccessibilityApplicationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async create(user: SessionUser, input: CreateAccessibilityApplicationDto) {
        const studentId = await this.resolveStudent(user, input.student_id);
        const message = input.message?.trim() || null;

        const created = await this.prisma.$transaction(async (transaction) => {
            await this.expireAccepted(transaction);
            const offer = await transaction.accessibilityOffer.findFirst({
                where: {
                    id: input.offer_id,
                    status: AccessibilityOfferStatus.APPROVED,
                    archivedAt: null,
                    subjects: { some: { subjectId: input.subject_id } },
                },
                include: {
                    teacher: { select: { fullName: true } },
                    subjects: {
                        where: { subjectId: input.subject_id },
                        include: { subject: { select: { name: true } } },
                    },
                },
            });
            if (!offer) {
                throw new NotFoundException('Предложение больше недоступно');
            }

            const existing = await transaction.accessibilityApplication.findFirst({
                where: {
                    offerId: offer.id,
                    studentId,
                    status: {
                        in: [
                            AccessibilityApplicationStatus.PENDING,
                            AccessibilityApplicationStatus.ACCEPTED,
                            AccessibilityApplicationStatus.CONFIRMED,
                        ],
                    },
                },
            });
            if (existing) {
                throw new ConflictException('Заявка по этим условиям уже отправлена');
            }
            const activeRelation = await transaction.teacherStudent.findUnique({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: offer.teacherId,
                        studentId,
                        subjectId: input.subject_id,
                    },
                },
            });
            if (activeRelation?.status === TeacherStudentStatus.ACTIVE) {
                throw new ConflictException(
                    'Ученик уже занимается с преподавателем по этому предмету',
                );
            }

            const reserved = await transaction.accessibilityApplication.count({
                where: { offerId: offer.id, status: { in: RESERVED_STATUSES } },
            });
            if (reserved >= offer.slots) {
                throw new ConflictException('Свободных мест больше нет');
            }

            const subjectName = offer.subjects[0]?.subject.name || 'Предмет';
            const application = await transaction.accessibilityApplication.create({
                data: {
                    offerId: offer.id,
                    teacherId: offer.teacherId,
                    studentId,
                    submittedById: user.id,
                    subjectId: input.subject_id,
                    message,
                    termsSnapshot: {
                        offer_type: offer.offerType.toLowerCase(),
                        discount_percent: offer.discountPercent,
                        default_duration_months: offer.defaultDurationMonths,
                        comment: offer.comment,
                        subject_name: subjectName,
                    },
                },
                include: applicationInclude,
            });

            await this.notifications.create(transaction, {
                userId: offer.teacherId,
                type: 'accessibility_application',
                title: 'Новая заявка по доступному образованию',
                message: `${user.fullName || 'Пользователь'} отправил(а) заявку по предмету «${subjectName}».`,
                targetSection: 'accessibility',
                targetEntityType: 'accessibility_application',
                targetEntityId: application.id,
                dedupeKey: `accessibility-application:${application.id}:created`,
            });
            return application;
        }, { isolationLevel: 'Serializable' });

        return {
            success: true,
            message: 'Заявка отправлена преподавателю',
            application: this.serialize(created),
        };
    }

    async mine(user: SessionUser) {
        if (user.role !== UserRole.STUDENT && user.role !== UserRole.PARENT) {
            throw new ForbiddenException('Заявки доступны ученику или родителю');
        }
        await this.prisma.$transaction((transaction) => this.expireAccepted(transaction));
        const applications = await this.prisma.accessibilityApplication.findMany({
            where: user.role === UserRole.PARENT
                ? { submittedById: user.id }
                : { studentId: user.id },
            include: applicationInclude,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        return {
            success: true,
            applications: applications.map((item) => this.serialize(item)),
        };
    }

    async forTeacher(user: SessionUser) {
        this.requireTeacher(user);
        await this.prisma.$transaction((transaction) => this.expireAccepted(transaction));
        const applications = await this.prisma.accessibilityApplication.findMany({
            where: { teacherId: user.id },
            include: applicationInclude,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 100,
        });
        return {
            success: true,
            applications: applications.map((item) => this.serialize(item)),
        };
    }

    async respond(
        user: SessionUser,
        applicationId: number,
        input: RespondAccessibilityApplicationDto,
    ) {
        this.requireTeacher(user);
        const comment = input.comment?.trim() || null;
        const now = new Date();

        const result = await this.prisma.$transaction(async (transaction) => {
            await this.expireAccepted(transaction);
            const application = await transaction.accessibilityApplication.findFirst({
                where: {
                    id: applicationId,
                    teacherId: user.id,
                    status: AccessibilityApplicationStatus.PENDING,
                },
                include: applicationInclude,
            });
            if (!application) {
                throw new NotFoundException('Заявка не найдена или уже обработана');
            }

            if (input.decision === 'accepted') {
                const offer = await transaction.accessibilityOffer.findUnique({
                    where: { id: application.offerId },
                    select: { slots: true },
                });
                const reserved = await transaction.accessibilityApplication.count({
                    where: {
                        offerId: application.offerId,
                        status: { in: RESERVED_STATUSES },
                    },
                });
                if (!offer || reserved >= offer.slots) {
                    throw new ConflictException('Свободных мест больше нет');
                }
            }

            const accepted = input.decision === 'accepted';
            const expiresAt = accepted
                ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
                : null;
            const updated = await transaction.accessibilityApplication.update({
                where: { id: application.id },
                data: {
                    status: accepted
                        ? AccessibilityApplicationStatus.ACCEPTED
                        : AccessibilityApplicationStatus.REJECTED,
                    teacherComment: comment,
                    respondedAt: now,
                    confirmationExpiresAt: expiresAt,
                    closedAt: accepted ? null : now,
                },
                include: applicationInclude,
            });
            await this.notifications.create(transaction, {
                userId: application.submittedById,
                type: accepted
                    ? 'accessibility_application_accepted'
                    : 'accessibility_application_rejected',
                title: accepted ? 'Преподаватель принял заявку' : 'Преподаватель отклонил заявку',
                message: accepted
                    ? 'Подтвердите условия программы в течение трёх дней.'
                    : (comment || 'Преподаватель не смог принять заявку.'),
                targetSection: 'findTeacher',
                targetEntityType: 'accessibility_application',
                targetEntityId: application.id,
                dedupeKey: `accessibility-application:${application.id}:${input.decision}`,
            });
            return updated;
        }, { isolationLevel: 'Serializable' });

        return {
            success: true,
            message: input.decision === 'accepted'
                ? 'Заявка принята и ожидает подтверждения семьи'
                : 'Заявка отклонена',
            application: this.serialize(result),
        };
    }

    async confirm(user: SessionUser, applicationId: number) {
        if (user.role !== UserRole.STUDENT && user.role !== UserRole.PARENT) {
            throw new ForbiddenException('Подтверждение доступно ученику или родителю');
        }
        const now = new Date();
        const application = await this.prisma.accessibilityApplication.findFirst({
            where: {
                id: applicationId,
                status: AccessibilityApplicationStatus.ACCEPTED,
                OR: [{ submittedById: user.id }, { studentId: user.id }],
            },
        });
        if (!application) throw new NotFoundException('Заявка не найдена');
        if (!application.confirmationExpiresAt || application.confirmationExpiresAt <= now) {
            await this.prisma.accessibilityApplication.update({
                where: { id: application.id },
                data: { status: AccessibilityApplicationStatus.EXPIRED, closedAt: now },
            });
            throw new ConflictException('Срок подтверждения заявки истёк');
        }
        await this.prisma.$transaction(async (transaction) => {
            await transaction.accessibilityApplication.update({
                where: { id: application.id },
                data: {
                    status: AccessibilityApplicationStatus.CONFIRMED,
                    confirmedAt: now,
                },
            });
            await transaction.teacherStudent.upsert({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: application.teacherId,
                        studentId: application.studentId,
                        subjectId: application.subjectId,
                    },
                },
                update: {
                    status: TeacherStudentStatus.ACTIVE,
                    startedAt: now,
                    archivedAt: null,
                },
                create: {
                    teacherId: application.teacherId,
                    studentId: application.studentId,
                    subjectId: application.subjectId,
                    status: TeacherStudentStatus.ACTIVE,
                    startedAt: now,
                },
            });
            await this.notifications.create(transaction, {
                userId: application.teacherId,
                type: 'accessibility_application_confirmed',
                title: 'Семья подтвердила условия',
                message: 'Ученик добавлен в список ваших учеников.',
                targetSection: 'students',
                targetEntityType: 'accessibility_application',
                targetEntityId: application.id,
                dedupeKey: `accessibility-application:${application.id}:confirmed`,
            });
        }, { isolationLevel: 'Serializable' });
        return { success: true, message: 'Условия подтверждены' };
    }

    private async resolveStudent(user: SessionUser, requestedStudentId?: number) {
        if (user.role === UserRole.STUDENT) {
            const profile = await this.prisma.studentProfile.findUnique({
                where: { userId: user.id },
                select: { birthYear: true },
            });
            if (!profile?.birthYear) {
                throw new BadRequestException('Укажите год рождения в анкете ученика');
            }
            if (new Date().getFullYear() - profile.birthYear < 18) {
                throw new ForbiddenException('Заявку несовершеннолетнего подаёт родитель');
            }
            return user.id;
        }
        if (user.role !== UserRole.PARENT || !requestedStudentId) {
            throw new BadRequestException('Выберите ребёнка');
        }
        const child = await this.prisma.parentChildProfile.findFirst({
            where: {
                parentId: user.id,
                studentId: requestedStudentId,
                archivedAt: null,
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                student: {
                    childLinks: {
                        some: {
                            parentId: user.id,
                            status: ParentStudentStatus.ACTIVE,
                        },
                    },
                },
            },
            select: { studentId: true },
        });
        if (!child?.studentId) {
            throw new ForbiddenException('Ребёнок не подтверждён или не привязан');
        }
        return child.studentId;
    }

    private async expireAccepted(transaction: Prisma.TransactionClient) {
        const now = new Date();
        await transaction.accessibilityApplication.updateMany({
            where: {
                status: AccessibilityApplicationStatus.ACCEPTED,
                confirmationExpiresAt: { lte: now },
            },
            data: { status: AccessibilityApplicationStatus.EXPIRED, closedAt: now },
        });
    }

    private serialize(application: Prisma.AccessibilityApplicationGetPayload<{
        include: typeof applicationInclude;
    }>) {
        return {
            id: application.id,
            offer_id: application.offerId,
            offer_type: application.offer.offerType.toLowerCase(),
            teacher_id: application.teacherId,
            teacher_name: application.teacher.fullName || 'Преподаватель',
            student_id: application.studentId,
            student_name: application.student.fullName || 'Ученик',
            submitted_by_name: application.submittedBy.fullName,
            submitted_by_role: application.submittedBy.role.toLowerCase(),
            subject_id: application.subjectId,
            subject_name: application.subject.name,
            message: application.message,
            terms: application.termsSnapshot,
            status: application.status.toLowerCase(),
            teacher_comment: application.teacherComment,
            confirmation_expires_at: application.confirmationExpiresAt,
            created_at: application.createdAt,
        };
    }

    private requireTeacher(user: SessionUser) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Заявки доступны только преподавателю');
        }
    }
}
