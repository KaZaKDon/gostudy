import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { AdminDictionariesService } from './admin-dictionaries.service';

const admin: SessionUser = {
    id: 1,
    role: UserRole.ADMIN,
    email: 'admin@example.com',
    fullName: 'Администратор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

const moderator: SessionUser = {
    ...admin,
    id: 2,
    role: UserRole.MODERATOR,
    email: 'moderator@example.com',
};

const metadata = { ipAddress: '127.0.0.1', userAgent: 'test' };

function createPrisma() {
    const transaction = {
        subjectGroup: {
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        subject: {
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        subjectPreparation: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
        },
        adminAuditLog: {
            create: vi.fn().mockResolvedValue(undefined),
        },
    };
    const prisma = {
        subjectGroup: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
        subject: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
        preparation: {
            findMany: vi.fn(),
        },
        subjectPreparation: {
            findMany: vi.fn(),
        },
        teacherSubjectPreparation: {
            count: vi.fn(),
        },
        $transaction: vi.fn(async (callback) => callback(transaction)),
    } as unknown as PrismaService;

    return {
        prisma,
        service: new AdminDictionariesService(prisma),
        transaction,
    };
}

describe('AdminDictionariesService', () => {
    it('returns subject groups with total and active subject counters', async () => {
        const { prisma, service } = createPrisma();
        vi.mocked(prisma.subjectGroup.findMany).mockResolvedValue([{
            id: 10,
            name: 'Школьные предметы',
            slug: 'school-subjects',
            sortOrder: 10,
            isActive: true,
            subjects: [{ isActive: true }, { isActive: false }],
        }] as never);

        const result = await service.listSubjectGroups(moderator);

        expect(result).toMatchObject({
            success: true,
            data: {
                items: [{ subjects_total: 2, active_subjects_total: 1 }],
            },
        });
    });

    it('does not allow a moderator to create dictionary entries', async () => {
        const { service } = createPrisma();

        await expect(service.createSubjectGroup(moderator, {
            name: 'Группа',
            slug: 'group',
            sort_order: 10,
            is_active: true,
        }, metadata)).rejects.toThrow('Изменять справочники может только администратор');
    });

    it('creates a subject and writes an audit record', async () => {
        const { prisma, service, transaction } = createPrisma();
        vi.mocked(prisma.subjectGroup.findUnique).mockResolvedValue({ id: 3 } as never);
        vi.mocked(prisma.subject.findFirst).mockResolvedValue(null);
        transaction.subject.create.mockResolvedValue({
            id: 7,
            groupId: 3,
            name: 'Математика',
            slug: 'mathematics',
            sortOrder: 10,
            isActive: true,
        });

        const result = await service.createSubject(admin, {
            group_id: 3,
            name: ' Математика ',
            slug: 'mathematics',
            sort_order: 10,
            is_active: true,
        }, metadata);

        expect(result).toMatchObject({ success: true, data: { id: 7 } });
        expect(transaction.subject.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ name: 'Математика', groupId: 3 }),
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
    });

    it('does not delete a subject used by lessons or relations', async () => {
        const { prisma, service } = createPrisma();
        vi.mocked(prisma.subject.findUnique).mockResolvedValue({
            id: 7,
            name: 'Математика',
            slug: 'mathematics',
            groupId: 3,
            sortOrder: 10,
            isActive: true,
            _count: {
                preparations: 0,
                teacherSubjects: 0,
                teacherPreparations: 0,
                lessons: 1,
                teacherStudents: 0,
                teacherRequests: 0,
            },
        } as never);

        await expect(service.deleteSubject(admin, 7, metadata))
            .rejects.toThrow('Нельзя удалить предмет, который используется в учебных данных');
    });

    it('replaces subject-preparation links and audits the change', async () => {
        const { prisma, service, transaction } = createPrisma();
        vi.mocked(prisma.subject.findUnique).mockResolvedValue({ id: 7, name: 'Математика' } as never);
        vi.mocked(prisma.preparation.findMany).mockResolvedValue([{ id: 4 }, { id: 5 }] as never);
        vi.mocked(prisma.subjectPreparation.findMany).mockResolvedValue([{
            subjectId: 7,
            preparationId: 4,
            sortOrder: 10,
        }] as never);

        const result = await service.updateSubjectPreparations(admin, 7, {
            preparations: [
                { id: 4, sort_order: 10 },
                { id: 5, sort_order: 20 },
            ],
        }, metadata);

        expect(result).toMatchObject({
            success: true,
            data: { subject_id: 7, preparations_total: 2 },
        });
        expect(transaction.subjectPreparation.deleteMany).toHaveBeenCalledWith({ where: { subjectId: 7 } });
        expect(transaction.subjectPreparation.createMany).toHaveBeenCalledOnce();
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
    });
});
