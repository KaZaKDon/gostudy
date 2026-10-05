import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service';
import {
    ParentChildVerificationStatus,
    ParentStudentStatus,
} from '../../generated/prisma/enums';
import { ParentChildAccessService } from './parent-child-access.service';

describe('ParentChildAccessService', () => {
    it('returns only verified, linked and active minor children', async () => {
        const prisma = {
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        parentId: 7,
                        studentId: 21,
                        firstName: 'Иван',
                        lastName: 'Ученик',
                        middleName: null,
                        timezone: 'Europe/Moscow',
                        student: {
                            studentProfile: { timezone: 'Europe/Moscow' },
                        },
                    },
                    {
                        parentId: 7,
                        studentId: null,
                        firstName: 'Новый',
                        lastName: 'Ребёнок',
                        middleName: null,
                        timezone: null,
                        student: null,
                    },
                ]),
            },
        } as unknown as PrismaService;
        const service = new ParentChildAccessService(prisma);
        const now = new Date('2026-09-21T12:00:00.000Z');

        await expect(service.listCurrentMinorStudentIds(7, now))
            .resolves.toEqual([21]);
        expect(prisma.parentChildProfile.findMany).toHaveBeenCalledWith({
            where: {
                parentId: 7,
                studentId: { not: null },
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                verifiedAt: { not: null },
                archivedAt: null,
                birthDate: { gt: new Date('2008-09-21T00:00:00.000Z') },
                student: {
                    childLinks: {
                        some: {
                            parentId: 7,
                            status: ParentStudentStatus.ACTIVE,
                            verifiedAt: { not: null },
                        },
                    },
                },
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: {
                parentId: true,
                studentId: true,
                firstName: true,
                lastName: true,
                middleName: true,
                timezone: true,
                student: {
                    select: {
                        studentProfile: {
                            select: { timezone: true },
                        },
                    },
                },
            },
        });
    });

    it('checks one parent-child pair without trusting a submitted student id', async () => {
        const prisma = {
            parentChildProfile: {
                findFirst: vi.fn().mockResolvedValue(null),
            },
        } as unknown as PrismaService;
        const service = new ParentChildAccessService(prisma);

        await expect(service.hasCurrentMinorAccess(
            7,
            21,
            new Date('2026-09-21T12:00:00.000Z'),
        )).resolves.toBe(false);
        expect(prisma.parentChildProfile.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ parentId: 7, studentId: 21 }),
            }),
        );
    });

    it('can enforce the same policy inside an existing transaction', async () => {
        const prisma = {
            parentChildProfile: {
                findFirst: vi.fn(),
            },
        } as unknown as PrismaService;
        const transaction = {
            parentChildProfile: {
                findFirst: vi.fn().mockResolvedValue({ id: 31 }),
            },
        };
        const service = new ParentChildAccessService(prisma);
        const now = new Date('2026-09-21T12:00:00.000Z');

        await expect(service.hasCurrentMinorAccessIn(
            transaction as never,
            7,
            21,
            now,
        )).resolves.toBe(true);
        expect(transaction.parentChildProfile.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    parentId: 7,
                    studentId: 21,
                    birthDate: { gt: new Date('2008-09-21T00:00:00.000Z') },
                }),
            }),
        );
        expect(prisma.parentChildProfile.findFirst).not.toHaveBeenCalled();
    });

    it('loads current minor children for parent-student pairs in one transaction', async () => {
        const transaction = {
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([{
                    parentId: 7,
                    studentId: 21,
                    firstName: 'Иван',
                    lastName: 'Ученик',
                    middleName: null,
                    timezone: null,
                    student: {
                        studentProfile: { timezone: 'Europe/Moscow' },
                    },
                }]),
            },
        };
        const service = new ParentChildAccessService({} as PrismaService);

        await expect(service.listCurrentMinorChildrenForPairsIn(
            transaction as never,
            [{ parentId: 7, studentId: 21 }],
            new Date('2026-09-21T12:00:00.000Z'),
        )).resolves.toEqual([{
            parentId: 7,
            studentId: 21,
            firstName: 'Иван',
            lastName: 'Ученик',
            middleName: null,
            timezone: null,
            studentTimezone: 'Europe/Moscow',
        }]);
        expect(transaction.parentChildProfile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [expect.objectContaining({
                        parentId: 7,
                        studentId: 21,
                    })],
                },
            }),
        );
    });
});
