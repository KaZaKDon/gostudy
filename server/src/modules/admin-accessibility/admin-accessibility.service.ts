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
    AccessibilityOfferStatus,
    AccessibilityOfferType,
    UserRole,
} from '../../generated/prisma/enums';
import { AccessibilityProgramService } from '../accessibility-program/accessibility-program.service';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { ListAccessibilityOffersQueryDto } from './dto/list-accessibility-offers-query.dto';
import type { ModerateAccessibilityOfferDto } from './dto/moderate-accessibility-offer.dto';

const STATUS = {
    pending: AccessibilityOfferStatus.PENDING,
    approved: AccessibilityOfferStatus.APPROVED,
    rejected: AccessibilityOfferStatus.REJECTED,
    archived: AccessibilityOfferStatus.ARCHIVED,
} as const;

const OFFER_TYPE = {
    free: AccessibilityOfferType.FREE,
    discount: AccessibilityOfferType.DISCOUNT,
    individual: AccessibilityOfferType.INDIVIDUAL,
} as const;

const adminOfferInclude = {
    teacher: {
        select: { id: true, fullName: true, email: true },
    },
    subjects: {
        orderBy: { subject: { sortOrder: 'asc' as const } },
        include: { subject: { select: { id: true, name: true } } },
    },
    supersedes: {
        select: { id: true, status: true, publishedAt: true },
    },
} satisfies Prisma.AccessibilityOfferInclude;

@Injectable()
export class AdminAccessibilityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly program: AccessibilityProgramService,
    ) {}

    async list(actor: SessionUser, query: ListAccessibilityOffersQueryDto) {
        this.requireModerator(actor);
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const where: Prisma.AccessibilityOfferWhereInput = {
            ...(query.status ? { status: STATUS[query.status] } : {}),
            ...(query.offer_type ? { offerType: OFFER_TYPE[query.offer_type] } : {}),
            ...(search ? {
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { teacher: { fullName: { contains: search, mode: 'insensitive' } } },
                    { teacher: { email: { contains: search, mode: 'insensitive' } } },
                    { subjects: { some: { subject: { name: { contains: search, mode: 'insensitive' } } } } },
                ],
            } : {}),
        };
        const [total, offers] = await Promise.all([
            this.prisma.accessibilityOffer.count({ where }),
            this.prisma.accessibilityOffer.findMany({
                where,
                include: adminOfferInclude,
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
        ]);

        return {
            success: true,
            data: {
                items: offers.map((offer) => this.serialize(offer)),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total,
                    pages: total ? Math.ceil(total / query.limit) : 0,
                },
            },
        };
    }

    async moderate(
        actor: SessionUser,
        offerId: number,
        input: ModerateAccessibilityOfferDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';
        if (input.decision === 'rejected' && !comment) {
            throw new BadRequestException('Укажите причину отклонения');
        }
        const current = await this.prisma.accessibilityOffer.findUnique({
            where: { id: offerId },
        });
        if (!current) throw new NotFoundException('Предложение не найдено');
        if (current.status !== AccessibilityOfferStatus.PENDING) {
            throw new ConflictException('Предложение уже обработано');
        }

        const now = new Date();
        const nextStatus = input.decision === 'approved'
            ? AccessibilityOfferStatus.APPROVED
            : AccessibilityOfferStatus.REJECTED;

        await this.prisma.$transaction(async (transaction) => {
            if (nextStatus === AccessibilityOfferStatus.APPROVED) {
                await transaction.accessibilityOffer.updateMany({
                    where: {
                        teacherId: current.teacherId,
                        offerType: current.offerType,
                        status: AccessibilityOfferStatus.APPROVED,
                        archivedAt: null,
                        id: { not: current.id },
                    },
                    data: {
                        status: AccessibilityOfferStatus.ARCHIVED,
                        archivedAt: now,
                    },
                });
            }
            await transaction.accessibilityOffer.update({
                where: { id: current.id },
                data: {
                    status: nextStatus,
                    moderationComment: comment || null,
                    moderatedById: actor.id,
                    moderatedAt: now,
                    publishedAt: input.decision === 'approved' ? now : null,
                },
            });
            await this.program.syncLegacyProfile(transaction, current.teacherId);
            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: `accessibility_offer.${input.decision}`,
                    entityType: 'accessibility_offer',
                    entityId: current.id,
                    oldValue: { status: current.status },
                    newValue: {
                        status: nextStatus,
                        comment: comment || null,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });
            await this.notifications.create(transaction, {
                userId: current.teacherId,
                type: `accessibility_offer_${input.decision}`,
                title: input.decision === 'approved'
                    ? 'Условия программы опубликованы'
                    : 'Условия программы отклонены',
                message: input.decision === 'approved'
                    ? 'Ваше предложение программы «Доступное образование» опубликовано.'
                    : `Предложение отклонено: ${comment}`,
                targetSection: 'accessibility',
                targetEntityType: 'accessibility_offer',
                targetEntityId: current.id,
                dedupeKey: `accessibility-offer:${current.id}:${input.decision}`,
            });
        });

        return {
            success: true,
            message: input.decision === 'approved'
                ? 'Предложение опубликовано'
                : 'Предложение отклонено',
        };
    }

    private serialize(offer: Prisma.AccessibilityOfferGetPayload<{
        include: typeof adminOfferInclude;
    }>) {
        return {
            id: offer.id,
            teacher_id: offer.teacherId,
            teacher_name: offer.teacher.fullName || 'Преподаватель',
            teacher_email: offer.teacher.email,
            offer_type: offer.offerType.toLowerCase(),
            slots: offer.slots,
            discount_percent: offer.discountPercent,
            default_duration_months: offer.defaultDurationMonths,
            comment: offer.comment,
            status: offer.status.toLowerCase(),
            subjects: offer.subjects.map((link) => ({
                id: link.subject.id,
                name: link.subject.name,
            })),
            supersedes: offer.supersedes
                ? {
                    id: offer.supersedes.id,
                    status: offer.supersedes.status.toLowerCase(),
                    published_at: offer.supersedes.publishedAt,
                }
                : null,
            moderation_comment: offer.moderationComment,
            created_at: offer.createdAt,
            updated_at: offer.updatedAt,
            published_at: offer.publishedAt,
        };
    }

    private requireModerator(actor: SessionUser) {
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
