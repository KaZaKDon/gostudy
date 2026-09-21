import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import type { RequestMetadata } from '../../common/http/request-metadata';
import {
    isAdultBirthDate,
    isPastBirthDate,
    parseIsoDateOnly,
} from '../../common/date/birth-date';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LegalRepresentativeType,
    ParentStudentLinkRequestStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { LegalConsentsService } from '../legal-consents/legal-consents.service';
import type { CreateParentChildDto } from './dto/create-parent-child.dto';

@Injectable()
export class ParentChildrenService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly legalConsents: LegalConsentsService,
    ) {}

    async list(user: SessionUser): Promise<Record<string, unknown>> {
        this.requireParent(user);

        const now = new Date();
        await this.prisma.parentStudentLinkRequest.updateMany({
            where: {
                status: ParentStudentLinkRequestStatus.PENDING,
                expiresAt: { lte: now },
                childProfile: { parentId: user.id },
            },
            data: {
                status: ParentStudentLinkRequestStatus.EXPIRED,
                respondedAt: now,
            },
        });

        const children = await this.prisma.parentChildProfile.findMany({
            where: {
                parentId: user.id,
                archivedAt: null,
            },
            orderBy: [
                { createdAt: 'asc' },
                { id: 'asc' },
            ],
            include: {
                student: { select: { email: true } },
                linkRequests: {
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    take: 1,
                    include: { student: { select: { email: true } } },
                },
            },
        });

        return {
            success: true,
            children: children.map((child) => this.toApi(child)),
        };
    }

    async create(
        user: SessionUser,
        input: CreateParentChildDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireParent(user);

        if (!input.legal_acceptance.accepted) {
            throw new BadRequestException(
                'Необходимо дать отдельное согласие на обработку данных ребёнка',
            );
        }

        const birthDate = this.parseMinorBirthDate(input.birth_date);
        const firstName = input.first_name.trim();
        const lastName = input.last_name.trim();
        const middleName = input.middle_name?.trim() || null;
        const duplicate = await this.prisma.parentChildProfile.findFirst({
            where: {
                parentId: user.id,
                firstName,
                lastName,
                birthDate,
                archivedAt: null,
            },
            select: { id: true },
        });

        if (duplicate) {
            throw new ConflictException(
                'Карточка этого ребёнка уже добавлена',
            );
        }

        const representativeTypes: Record<
            CreateParentChildDto['representative_type'],
            LegalRepresentativeType
        > = {
            parent: LegalRepresentativeType.PARENT,
            guardian: LegalRepresentativeType.GUARDIAN,
            trustee: LegalRepresentativeType.TRUSTEE,
        };
        const snapshot = this.legalConsents.getParentChildDataSnapshot(true);
        const child = await this.prisma.parentChildProfile.create({
            data: {
                parent: { connect: { id: user.id } },
                firstName,
                lastName,
                middleName,
                birthDate,
                city: input.city?.trim() || null,
                timezone: input.timezone?.trim() || null,
                classLevel: input.class_level?.trim() || null,
                representativeType:
                    representativeTypes[input.representative_type],
                consentAcceptance: {
                    create: {
                        userId: user.id,
                        type: snapshot.type,
                        source: snapshot.source,
                        accepted: snapshot.accepted,
                        consentText: snapshot.consentText,
                        ipAddress: metadata.ipAddress,
                        userAgent: metadata.userAgent,
                        documents: {
                            create: snapshot.documents,
                        },
                    },
                },
            },
        });

        return {
            success: true,
            message: 'Карточка ребёнка создана и ожидает подтверждения',
            child: this.toApi(child),
        };
    }

    private parseMinorBirthDate(value: string): Date {
        const birthDate = parseIsoDateOnly(value);

        if (!birthDate) {
            throw new BadRequestException('Укажите корректную дату рождения');
        }

        if (!isPastBirthDate(birthDate)) {
            throw new BadRequestException(
                'Дата рождения должна быть раньше текущей даты',
            );
        }

        if (isAdultBirthDate(birthDate)) {
            throw new BadRequestException(
                'Совершеннолетний пользователь регистрируется самостоятельно',
            );
        }

        return birthDate;
    }

    private toApi(child: Record<string, any>): Record<string, unknown> {
        const fullName = [
            child.lastName,
            child.firstName,
            child.middleName,
        ].filter(Boolean).join(' ');

        return {
            id: child.id,
            student_id: child.studentId,
            full_name: fullName,
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
            verified_at: child.verifiedAt?.toISOString() || null,
            student_account_created: Boolean(child.studentId),
            linked_student_email: child.student?.email || null,
            link_request: child.linkRequests?.[0]
                ? {
                    id: child.linkRequests[0].id,
                    status: child.linkRequests[0].status.toLowerCase(),
                    student_email: child.linkRequests[0].student?.email || null,
                    expires_at: child.linkRequests[0].expiresAt,
                    responded_at: child.linkRequests[0].respondedAt,
                    created_at: child.linkRequests[0].createdAt,
                }
                : null,
            created_at: child.createdAt.toISOString(),
        };
    }

    private requireParent(user: SessionUser): void {
        if (user.role !== UserRole.PARENT) {
            throw new ForbiddenException(
                'Раздел доступен только аккаунту родителя',
            );
        }
    }
}
