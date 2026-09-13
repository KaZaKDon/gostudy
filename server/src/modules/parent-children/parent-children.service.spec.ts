import { ConfigService } from '@nestjs/config';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LegalAcceptanceType,
    LegalRepresentativeType,
    ParentChildVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { LegalConsentsService } from '../legal-consents/legal-consents.service';
import type { CreateParentChildDto } from './dto/create-parent-child.dto';
import { ParentChildrenService } from './parent-children.service';

const parent: SessionUser = {
    id: 18,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Иванова Мария Сергеевна',
    phone: '+7 900 000-00-00',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function createInput(
    overrides: Partial<CreateParentChildDto> = {},
): CreateParentChildDto {
    return {
        last_name: 'Иванов',
        first_name: 'Иван',
        middle_name: 'Иванович',
        birth_date: '2014-05-12',
        city: 'Ростов-на-Дону',
        timezone: 'Europe/Moscow',
        class_level: '6 класс',
        representative_type: 'parent',
        legal_acceptance: { accepted: true },
        ...overrides,
    };
}

function createService(options: { duplicate?: boolean } = {}) {
    const storedChild = {
        id: 7,
        parentId: parent.id,
        studentId: null,
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович',
        birthDate: new Date('2014-05-12T00:00:00.000Z'),
        city: 'Ростов-на-Дону',
        timezone: 'Europe/Moscow',
        classLevel: '6 класс',
        representativeType: LegalRepresentativeType.PARENT,
        verificationStatus: ParentChildVerificationStatus.PENDING,
        verificationComment: null,
        consentAcceptanceId: 'acceptance-id',
        verifiedAt: null,
        archivedAt: null,
        createdAt: new Date('2026-09-08T12:00:00.000Z'),
        updatedAt: new Date('2026-09-08T12:00:00.000Z'),
    };
    const prisma = {
        parentChildProfile: {
            findMany: vi.fn().mockResolvedValue([storedChild]),
            findFirst: vi.fn().mockResolvedValue(
                options.duplicate ? { id: storedChild.id } : null,
            ),
            create: vi.fn().mockResolvedValue(storedChild),
        },
    } as unknown as PrismaService;
    const legalConsents = new LegalConsentsService(new ConfigService({
        LEGAL_DOCUMENTS_DIR: '../shared/legal',
    }));

    return {
        prisma,
        service: new ParentChildrenService(prisma, legalConsents),
    };
}

describe('ParentChildrenService', () => {
    it('creates a pending child card with a separate consent snapshot', async () => {
        const { prisma, service } = createService();

        const result = await service.create(
            parent,
            createInput(),
            { ipAddress: '127.0.0.1', userAgent: 'test' },
        );

        expect(prisma.parentChildProfile.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                parent: { connect: { id: parent.id } },
                birthDate: new Date('2014-05-12T00:00:00.000Z'),
                representativeType: LegalRepresentativeType.PARENT,
                consentAcceptance: {
                    create: expect.objectContaining({
                        userId: parent.id,
                        type: LegalAcceptanceType.PARENT_CHILD_DATA,
                        accepted: true,
                        ipAddress: '127.0.0.1',
                    }),
                },
            }),
        });
        expect(result).toMatchObject({
            success: true,
            child: {
                id: 7,
                full_name: 'Иванов Иван Иванович',
                verification_status: 'pending',
                student_account_created: false,
            },
        });
    });

    it('rejects creation without the separate child-data consent', async () => {
        const { service } = createService();

        await expect(service.create(
            parent,
            createInput({ legal_acceptance: { accepted: false } }),
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow(
            'Необходимо дать отдельное согласие на обработку данных ребёнка',
        );
    });

    it('rejects an adult birth date', async () => {
        const { service } = createService();

        await expect(service.create(
            parent,
            createInput({ birth_date: '1990-01-01' }),
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow(
            'Совершеннолетний пользователь регистрируется самостоятельно',
        );
    });

    it('does not allow a student to access parent children', async () => {
        const { service } = createService();

        await expect(service.list({
            ...parent,
            role: UserRole.STUDENT,
        })).rejects.toThrow('Раздел доступен только аккаунту родителя');
    });

    it('rejects a duplicate active child card', async () => {
        const { service } = createService({ duplicate: true });

        await expect(service.create(
            parent,
            createInput(),
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow('Карточка этого ребёнка уже добавлена');
    });
});
