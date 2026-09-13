import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';

import { PrismaService } from '../../common/prisma/prisma.service';
import { createOpaqueToken, hashToken } from '../../common/security/token';
import {
    ParentChildVerificationStatus,
    ParentStudentLinkRequestStatus,
    ParentStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateChildStudentAccountDto } from './dto/create-child-student-account.dto';
import type { LinkExistingStudentDto } from './dto/link-existing-student.dto';
import type { RespondParentLinkDto } from './dto/respond-parent-link.dto';

const LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const NO_MATCH_MESSAGE =
    'Не удалось отправить запрос. Проверьте email и совпадение имени и года рождения ученика';

@Injectable()
export class ParentStudentLinksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
        private readonly notifications: NotificationsService,
    ) {}

    async createStudentAccount(
        parent: SessionUser,
        childProfileId: number,
        input: CreateChildStudentAccountDto,
    ) {
        this.requireRole(parent, UserRole.PARENT, 'родителю');
        if (input.password !== input.password_confirmation) {
            throw new BadRequestException('Пароли не совпадают');
        }

        const email = input.email.trim().toLowerCase();
        const child = await this.prisma.parentChildProfile.findFirst({
            where: {
                id: childProfileId,
                parentId: parent.id,
                archivedAt: null,
            },
        });

        if (!child) {
            throw new NotFoundException('Карточка ребёнка не найдена');
        }
        if (child.verificationStatus !== ParentChildVerificationStatus.VERIFIED) {
            throw new ConflictException(
                'Сначала дождитесь подтверждения карточки администратором',
            );
        }
        if (child.studentId) {
            throw new ConflictException('Аккаунт ученика уже привязан');
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw new ConflictException(
                'Аккаунт с таким email уже существует. Используйте привязку существующего аккаунта',
            );
        }

        const passwordHash = await hash(input.password, 12);
        const verificationToken = createOpaqueToken();
        const now = new Date();
        const verificationExpiresAt = new Date(
            now.getTime()
            + this.getNumber('EMAIL_VERIFICATION_HOURS', 24) * 60 * 60 * 1000,
        );
        let createdUser: { id: number; email: string; fullName: string | null };

        try {
            createdUser = await this.prisma.$transaction(async (transaction) => {
                const user = await transaction.user.create({
                    data: {
                        role: UserRole.STUDENT,
                        email,
                        fullName: `${child.firstName} ${child.lastName}`,
                        passwordHash,
                        emailVerificationTokenHash: hashToken(verificationToken),
                        emailVerificationExpiresAt: verificationExpiresAt,
                        emailVerificationSentAt: now,
                        profileCompleted: false,
                        studentProfile: {
                            create: {
                                firstName: child.firstName,
                                lastName: child.lastName,
                                city: child.city,
                                timezone: child.timezone,
                                birthYear: child.birthDate.getUTCFullYear(),
                                classLevel: child.classLevel,
                                parentName: parent.fullName,
                                parentPhone: parent.phone,
                                parentEmail: parent.email,
                            },
                        },
                    },
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    },
                });

                await transaction.parentChildProfile.update({
                    where: { id: child.id },
                    data: { studentId: user.id },
                });
                await transaction.parentStudent.create({
                    data: {
                        parentId: parent.id,
                        studentId: user.id,
                        status: ParentStudentStatus.ACTIVE,
                        verifiedAt: now,
                    },
                });
                await transaction.parentStudentLinkRequest.updateMany({
                    where: {
                        childProfileId: child.id,
                        status: ParentStudentLinkRequestStatus.PENDING,
                    },
                    data: {
                        status: ParentStudentLinkRequestStatus.CANCELLED,
                        respondedAt: now,
                    },
                });

                return user;
            });
        } catch (error) {
            if (this.isUniqueConstraintError(error)) {
                throw new ConflictException(
                    'Аккаунт с таким email уже существует или карточка уже привязана',
                );
            }
            throw error;
        }

        const mailSent = await this.mail.sendVerificationEmail(
            createdUser.email,
            createdUser.fullName || 'ученик GoStudy',
            this.createVerificationUrl(verificationToken),
        );
        if (!mailSent) {
            await this.prisma.user.update({
                where: { id: createdUser.id },
                data: { emailVerificationSentAt: null },
            });
        }

        return {
            success: true,
            message: mailSent
                ? 'Аккаунт ученика создан. На его почту отправлено письмо подтверждения.'
                : this.config.get('NODE_ENV') === 'development'
                    ? 'Аккаунт ученика создан. В локальном режиме ссылка подтверждения выведена в журнал API.'
                    : 'Аккаунт ученика создан, но письмо подтверждения не удалось отправить.',
            email_verification_required: true,
            mail_sent: mailSent,
            student: {
                id: createdUser.id,
                email: createdUser.email,
                full_name: createdUser.fullName,
            },
        };
    }

    async requestExisting(
        parent: SessionUser,
        childProfileId: number,
        input: LinkExistingStudentDto,
    ) {
        this.requireRole(parent, UserRole.PARENT, 'родителю');
        const now = new Date();
        await this.expireRequests({ childProfileId }, now);

        const child = await this.prisma.parentChildProfile.findFirst({
            where: {
                id: childProfileId,
                parentId: parent.id,
                archivedAt: null,
            },
        });

        if (!child) {
            throw new NotFoundException('Карточка ребёнка не найдена');
        }
        if (child.verificationStatus !== ParentChildVerificationStatus.VERIFIED) {
            throw new ConflictException(
                'Сначала дождитесь подтверждения карточки администратором',
            );
        }
        if (child.studentId) {
            throw new ConflictException('Аккаунт ученика уже привязан');
        }

        const student = await this.prisma.user.findUnique({
            where: { email: input.email },
            include: {
                studentProfile: true,
                linkedChildProfile: { select: { id: true } },
            },
        });

        if (!student || !this.matchesChild(student, child)) {
            throw new BadRequestException(NO_MATCH_MESSAGE);
        }

        if (student.linkedChildProfile) {
            throw new ConflictException(
                'Этот ученический аккаунт уже связан с другой карточкой',
            );
        }

        const currentRequest = await this.prisma.parentStudentLinkRequest.findFirst({
            where: {
                childProfileId,
                status: ParentStudentLinkRequestStatus.PENDING,
            },
            include: { student: { select: { email: true } } },
        });

        if (currentRequest) {
            if (currentRequest.studentId !== student.id) {
                throw new ConflictException(
                    'По карточке уже ожидается ответ другого аккаунта ученика',
                );
            }

            return {
                success: true,
                message: 'Запрос уже ожидает подтверждения ученика',
                request: this.requestToApi(currentRequest),
            };
        }

        const request = await this.prisma.parentStudentLinkRequest.create({
            data: {
                childProfileId,
                studentId: student.id,
                expiresAt: new Date(now.getTime() + LINK_LIFETIME_MS),
            },
            include: { student: { select: { email: true } } },
        });

        await this.notifications.create(this.prisma, {
            userId: student.id,
            type: 'parent_link_requested',
            title: 'Запрос на связь с родителем',
            message: `${parent.fullName || parent.email} указал вас в карточке ребёнка`,
            targetSection: 'family',
            targetEntityType: 'parent_student_link_request',
            targetEntityId: request.id,
            dedupeKey: `parent-link-request:${request.id}`,
        });

        return {
            success: true,
            message: 'Запрос отправлен в кабинет ученика',
            request: this.requestToApi(request),
        };
    }

    async listForStudent(student: SessionUser) {
        this.requireRole(student, UserRole.STUDENT, 'ученику');
        const now = new Date();
        await this.expireRequests({ studentId: student.id }, now);
        const [requests, parents] = await Promise.all([
            this.prisma.parentStudentLinkRequest.findMany({
                where: {
                    studentId: student.id,
                    status: ParentStudentLinkRequestStatus.PENDING,
                    expiresAt: { gt: now },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                include: {
                    childProfile: {
                        include: {
                            parent: {
                                select: {
                                    fullName: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.parentStudent.findMany({
                where: {
                    studentId: student.id,
                    status: ParentStudentStatus.ACTIVE,
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    parent: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            requests: requests.map((request) => ({
                ...this.requestToApi(request),
                child: {
                    id: request.childProfile.id,
                    full_name: this.childName(request.childProfile),
                    birth_date: request.childProfile.birthDate
                        .toISOString().slice(0, 10),
                },
                parent: {
                    full_name: request.childProfile.parent.fullName,
                    email: request.childProfile.parent.email,
                    phone: request.childProfile.parent.phone,
                },
            })),
            parents: parents.map((link) => ({
                id: link.parent.id,
                full_name: link.parent.fullName,
                email: link.parent.email,
                phone: link.parent.phone,
                verified_at: link.verifiedAt,
            })),
        };
    }

    async respond(
        student: SessionUser,
        requestId: number,
        input: RespondParentLinkDto,
    ) {
        this.requireRole(student, UserRole.STUDENT, 'ученику');
        const now = new Date();
        await this.expireRequests({ studentId: student.id }, now);
        const result = await this.prisma.$transaction(async (transaction) => {
            const request = await transaction.parentStudentLinkRequest.findUnique({
                where: { id: requestId },
                include: { childProfile: true },
            });

            if (!request || request.studentId !== student.id) {
                throw new NotFoundException('Запрос на привязку не найден');
            }
            if (request.status === ParentStudentLinkRequestStatus.EXPIRED) {
                throw new ConflictException('Срок действия запроса истёк');
            }
            if (request.status !== ParentStudentLinkRequestStatus.PENDING) {
                throw new ConflictException('Ответ по этому запросу уже сохранён');
            }
            if (request.expiresAt <= now) {
                throw new ConflictException('Срок действия запроса истёк');
            }

            if (!input.accept) {
                await transaction.parentStudentLinkRequest.update({
                    where: { id: request.id },
                    data: {
                        status: ParentStudentLinkRequestStatus.REJECTED,
                        respondedAt: now,
                    },
                });
                await this.notifyParent(
                    transaction,
                    request.childProfile.parentId,
                    request.childProfile,
                    request.id,
                    false,
                );
                return { linked: false };
            }

            if (
                request.childProfile.verificationStatus
                    !== ParentChildVerificationStatus.VERIFIED
                || request.childProfile.archivedAt
            ) {
                throw new ConflictException(
                    'Карточка ребёнка больше не доступна для привязки',
                );
            }
            if (
                request.childProfile.studentId
                && request.childProfile.studentId !== student.id
            ) {
                throw new ConflictException(
                    'К карточке уже привязан другой ученический аккаунт',
                );
            }

            const otherCard = await transaction.parentChildProfile.findFirst({
                where: {
                    studentId: student.id,
                    id: { not: request.childProfileId },
                    archivedAt: null,
                },
                select: { id: true },
            });
            if (otherCard) {
                throw new ConflictException(
                    'Ученический аккаунт уже связан с другой карточкой',
                );
            }

            await transaction.parentChildProfile.update({
                where: { id: request.childProfileId },
                data: { studentId: student.id },
            });
            await transaction.parentStudent.upsert({
                where: {
                    parentId_studentId: {
                        parentId: request.childProfile.parentId,
                        studentId: student.id,
                    },
                },
                create: {
                    parentId: request.childProfile.parentId,
                    studentId: student.id,
                    status: ParentStudentStatus.ACTIVE,
                    verifiedAt: now,
                },
                update: {
                    status: ParentStudentStatus.ACTIVE,
                    verifiedAt: now,
                },
            });
            await transaction.parentStudentLinkRequest.update({
                where: { id: request.id },
                data: {
                    status: ParentStudentLinkRequestStatus.ACCEPTED,
                    respondedAt: now,
                },
            });
            await this.notifyParent(
                transaction,
                request.childProfile.parentId,
                request.childProfile,
                request.id,
                true,
            );

            return { linked: true };
        });

        return {
            success: true,
            linked: result.linked,
            message: result.linked
                ? 'Связь с родителем подтверждена'
                : 'Запрос отклонён',
        };
    }

    private matchesChild(student: Record<string, any> | null, child: Record<string, any>) {
        if (
            !student
            || student.role !== UserRole.STUDENT
            || student.status !== UserStatus.ACTIVE
            || student.archivedAt
            || !student.emailVerifiedAt
            || !student.studentProfile
        ) {
            return false;
        }

        const profile = student.studentProfile;
        return this.normalize(profile.firstName) === this.normalize(child.firstName)
            && this.normalize(profile.lastName) === this.normalize(child.lastName)
            && profile.birthYear === child.birthDate.getUTCFullYear();
    }

    private async expireRequests(
        where: { childProfileId?: number; studentId?: number },
        now: Date,
    ) {
        await this.prisma.parentStudentLinkRequest.updateMany({
            where: {
                ...where,
                status: ParentStudentLinkRequestStatus.PENDING,
                expiresAt: { lte: now },
            },
            data: {
                status: ParentStudentLinkRequestStatus.EXPIRED,
                respondedAt: now,
            },
        });
    }

    private async notifyParent(
        transaction: Parameters<NotificationsService['create']>[0],
        parentId: number,
        child: Record<string, any>,
        requestId: number,
        accepted: boolean,
    ) {
        await this.notifications.create(transaction, {
            userId: parentId,
            type: accepted ? 'parent_link_accepted' : 'parent_link_rejected',
            title: accepted
                ? 'Аккаунт ученика привязан'
                : 'Ученик отклонил запрос',
            message: this.childName(child),
            targetSection: 'children',
            targetEntityType: 'parent_child_profile',
            targetEntityId: child.id,
            dedupeKey: `parent-link-response:${requestId}`,
        });
    }

    private requestToApi(request: Record<string, any>) {
        return {
            id: request.id,
            status: request.status.toLowerCase(),
            student_email: request.student?.email,
            expires_at: request.expiresAt,
            responded_at: request.respondedAt,
            created_at: request.createdAt,
        };
    }

    private childName(child: Record<string, any>) {
        return [child.lastName, child.firstName, child.middleName]
            .filter(Boolean)
            .join(' ');
    }

    private normalize(value: unknown) {
        return typeof value === 'string'
            ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU')
            : '';
    }

    private createVerificationUrl(token: string) {
        const appUrl = this.config.get<string>(
            'APP_URL',
            'http://localhost:5174',
        );
        return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    }

    private getNumber(key: string, fallback: number) {
        const value = Number(this.config.get(key, fallback));
        return Number.isFinite(value) ? value : fallback;
    }

    private isUniqueConstraintError(error: unknown) {
        return typeof error === 'object'
            && error !== null
            && 'code' in error
            && error.code === 'P2002';
    }

    private requireRole(user: SessionUser, role: UserRole, label: string) {
        if (user.role !== role) {
            throw new ForbiddenException(`Раздел доступен только ${label}`);
        }
    }
}
