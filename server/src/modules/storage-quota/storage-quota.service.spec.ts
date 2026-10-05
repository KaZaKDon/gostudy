import { PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageQuotaService } from './storage-quota.service';

function createService(queryResult: unknown[] = []) {
    const prisma = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        $queryRaw: vi.fn().mockResolvedValue(queryResult),
    } as unknown as PrismaService;
    const service = new StorageQuotaService(
        prisma,
        new ConfigService({ UPLOAD_USER_QUOTA_BYTES: 10_000 }),
    );

    return { prisma, service };
}

describe('StorageQuotaService', () => {
    it('returns used, remaining and percentage values', async () => {
        const { service } = createService([{
            used_bytes: 2_500n,
            limit_bytes: null,
        }]);

        await expect(service.getUsage(17)).resolves.toEqual({
            success: true,
            used_bytes: 2_500,
            limit_bytes: 10_000,
            remaining_bytes: 7_500,
            usage_percent: 25,
        });
    });

    it('reserves space with one atomic database update', async () => {
        const { prisma, service } = createService([{ user_id: 17 }]);

        await expect(service.reserve(17, 512)).resolves.toBeUndefined();
        expect(prisma.$executeRaw).toHaveBeenCalledOnce();
        expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it('rejects an upload when the atomic reservation does not fit', async () => {
        const { service } = createService([]);

        await expect(service.reserve(17, 512))
            .rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('releases space through the supplied transaction client', async () => {
        const { service } = createService();
        const transaction = {
            $executeRaw: vi.fn().mockResolvedValue(1),
        };

        await expect(service.release(
            17,
            512n,
            transaction as never,
        )).resolves.toBeUndefined();
        expect(transaction.$executeRaw).toHaveBeenCalledTimes(2);
    });
});
