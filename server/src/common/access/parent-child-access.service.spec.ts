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
                    { studentId: 21 },
                    { studentId: null },
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
            select: { studentId: true },
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
});
