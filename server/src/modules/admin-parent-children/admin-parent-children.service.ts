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
    ParentChildVerificationStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { ListParentChildrenQueryDto } from './dto/list-parent-children-query.dto';
import type { ReviewParentChildDto } from './dto/review-parent-child.dto';

const STATUS_MAP = {
    pending: ParentChildVerificationStatus.PENDING,
    verified: ParentChildVerificationStatus.VERIFIED,
    rejected: ParentChildVerificationStatus.REJECTED,
};

@Injectable()
export class AdminParentChildrenService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async list(actor: SessionUser, query: ListParentChildrenQueryDto) {
        this.requireAdmin(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const where: Prisma.ParentChildProfileWhereInput = {
            archivedAt: null,
            ...(query.status
                ? { verificationStatus: STATUS_MAP[query.status] }
                : {}),
            ...(search
                ? {
                    OR: [
                        ...(numericId ? [{ id: numericId }] : []),
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { middleName: { contains: search, mode: 'insensitive' } },
                        { parent: { fullName: { contains: search, mode: 'insensitive' } } },
                        { parent: { email: { contains: search, mode: 'insensitive' } } },
                        { parent: { phone: { contains: search, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const [total, children] = await Promise.all([
            this.prisma.parentChildProfile.count({ where }),
            this.prisma.parentChildProfile.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    parent: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            emailVerifiedAt: true,
                        },
                    },
                    consentAcceptance: {
                        select: {
                            accepted: true,
                            createdAt: true,
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: children.map((child) => this.serialize(child)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async review(
        actor: SessionUser,
        childProfileId: number,
        input: ReviewParentChildDto,
        metadata: RequestMetadata,
    ) {
        this.requireAdmin(actor);
        const comment = input.comment?.trim() || '';

        if (input.decision !== 'approved' && !comment) {
            throw new BadRequestException(
                'Укажите причину решения или необходимые уточнения',
            );
        }

        const result = await this.prisma.$transaction(async (transaction) => {
            const child = await transaction.parentChildProfile.findUnique({
                where: { id: childProfileId },
            });

            if (!child || child.archivedAt) {
                throw new NotFoundException('Карточка ребёнка не найдена');
            }

            if (child.verificationStatus !== ParentChildVerificationStatus.PENDING) {
                throw new ConflictException('Решение по карточке уже принято');
            }

            const updated = await transaction.parentChildProfile.update({
                where: { id: childProfileId },
                data: input.decision === 'approved'
                    ? {
                        verificationStatus: ParentChildVerificationStatus.VERIFIED,
                        verificationComment: comment || null,
                        verifiedAt: new Date(),
                    }
                    : input.decision === 'rejected'
                        ? {
                            verificationStatus: ParentChildVerificationStatus.REJECTED,
                            verificationComment: comment,
                            verifiedAt: null,
                        }
                        : {
                            verificationStatus: ParentChildVerificationStatus.PENDING,
                            verificationComment: comment,
                            verifiedAt: null,
                        },
            });

            const action = input.decision === 'approved'
                ? 'parent_child_verified'
                : input.decision === 'rejected'
                    ? 'parent_child_rejected'
                    : 'parent_child_clarification_requested';

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action,
                    entityType: 'parent_child_profile',
                    entityId: child.id,
                    oldValue: {
                        verification_status: child.verificationStatus,
                        verification_comment: child.verificationComment,
                        verified_at: child.verifiedAt?.toISOString() || null,
                    },
                    newValue: {
                        verification_status: updated.verificationStatus,
                        verification_comment: updated.verificationComment,
                        verified_at: updated.verifiedAt?.toISOString() || null,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            const childName = [child.lastName, child.firstName, child.middleName]
                .filter(Boolean)
                .join(' ');
            await this.notifications.create(transaction, {
                userId: child.parentId,
                type: action,
                title: input.decision === 'approved'
                    ? 'Карточка ребёнка подтверждена'
                    : input.decision === 'rejected'
                        ? 'Карточка ребёнка отклонена'
                        : 'Нужны уточнения по карточке ребёнка',
                message: input.decision === 'approved'
                    ? `${childName}: теперь можно подключить аккаунт ученика`
                    : comment,
                targetSection: 'children',
                targetEntityType: 'parent_child_profile',
                targetEntityId: child.id,
            });

            return updated;
        });

        return {
            success: true,
            message: input.decision === 'approved'
                ? 'Карточка подтверждена'
                : input.decision === 'rejected'
                    ? 'Карточка отклонена'
                    : 'Запрос уточнений отправлен родителю',
            child: this.serialize(result),
        };
    }

    private requireAdmin(actor: SessionUser): void {
        if (actor.role !== UserRole.ADMIN) {
            throw new ForbiddenException(
                'Проверка родительской связи доступна только администратору',
            );
        }
    }

    private serialize(child: Record<string, any>) {
        return {
            id: child.id,
            parent_id: child.parentId,
            student_id: child.studentId,
            full_name: [child.lastName, child.firstName, child.middleName]
                .filter(Boolean)
                .join(' '),
            first_name: child.firstName,
            last_name: child.lastName,
            middle_name: child.middleName,
            birth_date: child.birthDate.toISOString().slice(0, 10),
            city: child.city,
            timezone: child.timezone,
            class_level: child.classLevel,
            representative_type: child.representativeType.toLowerCase(),
            verification_status: child.verificationStatus.toLowerCase(),
            verification_comment: child.verificationComment,
            verified_at: child.verifiedAt,
            created_at: child.createdAt,
            parent: child.parent
                ? {
                    id: child.parent.id,
                    full_name: child.parent.fullName,
                    email: child.parent.email,
                    phone: child.parent.phone,
                    email_verified: Boolean(child.parent.emailVerifiedAt),
                }
                : undefined,
            consent: child.consentAcceptance
                ? {
                    accepted: child.consentAcceptance.accepted,
                    accepted_at: child.consentAcceptance.createdAt,
                }
                : undefined,
        };
    }
}
