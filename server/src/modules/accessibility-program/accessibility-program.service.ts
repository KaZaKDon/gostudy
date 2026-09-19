import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    AccessibilityOfferStatus,
    AccessibilityOfferType,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { SaveAccessibilityOfferDto } from './dto/save-accessibility-offer.dto';

const OFFER_TYPE = {
    free: AccessibilityOfferType.FREE,
    discount: AccessibilityOfferType.DISCOUNT,
    individual: AccessibilityOfferType.INDIVIDUAL,
} as const;

const offerInclude = {
    subjects: {
        orderBy: { subject: { sortOrder: 'asc' as const } },
        include: { subject: { select: { id: true, name: true } } },
    },
} satisfies Prisma.AccessibilityOfferInclude;

@Injectable()
export class AccessibilityProgramService {
    constructor(private readonly prisma: PrismaService) {}

    async show(user: SessionUser) {
        this.requireTeacher(user);
        const [subjects, offers] = await Promise.all([
            this.prisma.teacherSubject.findMany({
                where: {
                    teacherId: user.id,
                    subject: { isActive: true },
                },
                orderBy: { subject: { sortOrder: 'asc' } },
                select: {
                    subjectId: true,
                    subject: { select: { name: true } },
                },
            }),
            this.prisma.accessibilityOffer.findMany({
                where: {
                    teacherId: user.id,
                    status: { not: AccessibilityOfferStatus.ARCHIVED },
                },
                include: offerInclude,
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            }),
        ]);

        return {
            success: true,
            subjects: subjects.map((item) => ({
                id: item.subjectId,
                name: item.subject.name,
            })),
            offers: offers.map((offer) => this.serialize(offer)),
            rules: {
                discount_min: 10,
                discount_max: 90,
                discount_step: 5,
                slot_limit: 10,
                duration_options: [1, 3, 6, 12, null],
                confirmation_days: 3,
            },
        };
    }

    async save(user: SessionUser, input: SaveAccessibilityOfferDto) {
        this.requireTeacher(user);
        const offerType = OFFER_TYPE[input.offer_type];
        const subjectIds = [...new Set(input.subject_ids)];
        const comment = input.comment?.trim() || null;

        this.validateTerms(offerType, input);
        await this.validateSubjects(user.id, subjectIds);

        const offer = await this.prisma.$transaction(async (transaction) => {
            const pending = await transaction.accessibilityOffer.findFirst({
                where: {
                    teacherId: user.id,
                    offerType,
                    status: AccessibilityOfferStatus.PENDING,
                },
                orderBy: { id: 'desc' },
            });
            const current = pending ?? await transaction.accessibilityOffer.findFirst({
                where: {
                    teacherId: user.id,
                    offerType,
                    status: AccessibilityOfferStatus.APPROVED,
                    archivedAt: null,
                },
                orderBy: { publishedAt: 'desc' },
            });
            const data = {
                slots: input.slots,
                discountPercent: offerType === AccessibilityOfferType.DISCOUNT
                    ? input.discount_percent ?? null
                    : null,
                defaultDurationMonths: input.default_duration_months ?? null,
                comment,
                status: AccessibilityOfferStatus.PENDING,
                moderationComment: null,
                moderatedById: null,
                moderatedAt: null,
                publishedAt: null,
                archivedAt: null,
            };

            if (!pending) {
                await transaction.accessibilityOffer.updateMany({
                    where: {
                        teacherId: user.id,
                        offerType,
                        status: AccessibilityOfferStatus.REJECTED,
                    },
                    data: {
                        status: AccessibilityOfferStatus.ARCHIVED,
                        archivedAt: new Date(),
                    },
                });
            }

            const saved = pending
                ? await transaction.accessibilityOffer.update({
                    where: { id: pending.id },
                    data: {
                        ...data,
                        subjects: {
                            deleteMany: {},
                            create: subjectIds.map((subjectId) => ({ subjectId })),
                        },
                    },
                    include: offerInclude,
                })
                : await transaction.accessibilityOffer.create({
                    data: {
                        teacherId: user.id,
                        offerType,
                        supersedesId: current?.status === AccessibilityOfferStatus.APPROVED
                            ? current.id
                            : null,
                        ...data,
                        subjects: {
                            create: subjectIds.map((subjectId) => ({ subjectId })),
                        },
                    },
                    include: offerInclude,
                });

            return saved;
        });

        return {
            success: true,
            message: 'Условия отправлены на модерацию',
            offer: this.serialize(offer),
        };
    }

    async archive(user: SessionUser, offerId: number) {
        this.requireTeacher(user);
        const offer = await this.prisma.accessibilityOffer.findFirst({
            where: { id: offerId, teacherId: user.id },
        });
        if (!offer) throw new NotFoundException('Предложение не найдено');

        await this.prisma.$transaction(async (transaction) => {
            await transaction.accessibilityOffer.update({
                where: { id: offer.id },
                data: {
                    status: AccessibilityOfferStatus.ARCHIVED,
                    archivedAt: new Date(),
                },
            });
            await this.syncLegacyProfile(transaction, user.id);
        });

        return {
            success: true,
            message: offer.status === AccessibilityOfferStatus.PENDING
                ? 'Заявка на модерацию отменена'
                : 'Предложение закрыто для новых заявок',
        };
    }

    async syncLegacyProfile(
        transaction: Prisma.TransactionClient,
        teacherId: number,
    ) {
        const approved = await transaction.accessibilityOffer.findMany({
            where: {
                teacherId,
                status: AccessibilityOfferStatus.APPROVED,
                archivedAt: null,
            },
            select: { offerType: true, slots: true, comment: true },
        });
        const types = new Set(approved.map((offer) => offer.offerType));

        await transaction.teacherProfile.updateMany({
            where: { userId: teacherId },
            data: {
                accessibilityEnabled: approved.length > 0,
                accessibilityFreeLessons: types.has(AccessibilityOfferType.FREE),
                accessibilityDiscount: types.has(AccessibilityOfferType.DISCOUNT),
                accessibilityIndividual: types.has(AccessibilityOfferType.INDIVIDUAL),
                accessibilitySlots: approved.reduce(
                    (total, offer) => total + offer.slots,
                    0,
                ) || null,
                accessibilityComment: approved
                    .map((offer) => offer.comment)
                    .filter(Boolean)
                    .join('\n') || null,
            },
        });
    }

    serialize(offer: Prisma.AccessibilityOfferGetPayload<{
        include: typeof offerInclude;
    }>) {
        return {
            id: offer.id,
            offer_type: offer.offerType.toLowerCase(),
            slots: offer.slots,
            discount_percent: offer.discountPercent,
            default_duration_months: offer.defaultDurationMonths,
            comment: offer.comment,
            status: offer.status.toLowerCase(),
            supersedes_id: offer.supersedesId,
            moderation_comment: offer.moderationComment,
            published_at: offer.publishedAt,
            updated_at: offer.updatedAt,
            subjects: offer.subjects.map((link) => ({
                id: link.subject.id,
                name: link.subject.name,
            })),
        };
    }

    private validateTerms(
        offerType: AccessibilityOfferType,
        input: SaveAccessibilityOfferDto,
    ) {
        if (
            offerType === AccessibilityOfferType.DISCOUNT
            && (
                input.discount_percent === undefined
                || input.discount_percent === null
                || input.discount_percent % 5 !== 0
            )
        ) {
            throw new BadRequestException(
                'Укажите скидку от 10% до 90% с шагом 5%',
            );
        }
        if (
            offerType !== AccessibilityOfferType.DISCOUNT
            && input.discount_percent !== undefined
            && input.discount_percent !== null
        ) {
            throw new BadRequestException(
                'Скидка указывается только для предложения со скидкой',
            );
        }
        if (
            input.default_duration_months !== undefined
            && input.default_duration_months !== null
            && ![1, 3, 6, 12].includes(input.default_duration_months)
        ) {
            throw new BadRequestException('Выберите допустимый срок участия');
        }
    }

    private async validateSubjects(teacherId: number, subjectIds: number[]) {
        const count = await this.prisma.teacherSubject.count({
            where: {
                teacherId,
                subjectId: { in: subjectIds },
                subject: { isActive: true },
            },
        });
        if (count !== subjectIds.length) {
            throw new BadRequestException(
                'Можно выбрать только предметы из анкеты преподавателя',
            );
        }
    }

    private requireTeacher(user: SessionUser) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Программа доступна только преподавателю',
            );
        }
    }
}
