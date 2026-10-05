import {
    Injectable,
    PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

type StorageQuotaDatabase = PrismaService | Prisma.TransactionClient;

type StorageUsageRow = {
    used_bytes: bigint;
    limit_bytes: bigint | null;
};

const DEFAULT_USER_QUOTA_BYTES = 300 * 1024 * 1024;

@Injectable()
export class StorageQuotaService {
    private readonly defaultLimitBytes: bigint;

    constructor(
        private readonly prisma: PrismaService,
        config: ConfigService,
    ) {
        const configured = Number(config.get('UPLOAD_USER_QUOTA_BYTES'));
        this.defaultLimitBytes = BigInt(
            Number.isSafeInteger(configured) && configured > 0
                ? configured
                : DEFAULT_USER_QUOTA_BYTES,
        );
    }

    async getUsage(userId: number): Promise<Record<string, unknown>> {
        await this.ensureUsageRow(this.prisma, userId);
        const [usage] = await this.prisma.$queryRaw<StorageUsageRow[]>(Prisma.sql`
            SELECT "used_bytes", "limit_bytes"
            FROM "user_storage_usages"
            WHERE "user_id" = ${userId}
        `);
        const usedBytes = usage?.used_bytes ?? 0n;
        const limitBytes = usage?.limit_bytes ?? this.defaultLimitBytes;
        const remainingBytes = usedBytes >= limitBytes
            ? 0n
            : limitBytes - usedBytes;

        return {
            success: true,
            used_bytes: Number(usedBytes),
            limit_bytes: Number(limitBytes),
            remaining_bytes: Number(remainingBytes),
            usage_percent: limitBytes === 0n
                ? 100
                : Math.min(
                    100,
                    Number((usedBytes * 10_000n) / limitBytes) / 100,
                ),
        };
    }

    async reserve(userId: number, byteCount: number): Promise<void> {
        const bytes = this.normalizeByteCount(byteCount);
        if (bytes === 0n) return;

        await this.ensureUsageRow(this.prisma, userId);
        const updated = await this.prisma.$queryRaw<Array<{ user_id: number }>>(Prisma.sql`
            UPDATE "user_storage_usages"
            SET
                "used_bytes" = "used_bytes" + ${bytes},
                "updated_at" = CURRENT_TIMESTAMP
            WHERE "user_id" = ${userId}
              AND "used_bytes" + ${bytes}
                  <= COALESCE("limit_bytes", ${this.defaultLimitBytes})
            RETURNING "user_id"
        `);

        if (!updated.length) {
            throw new PayloadTooLargeException(
                'Недостаточно свободного места в хранилище',
            );
        }
    }

    async release(
        userId: number,
        byteCount: number | bigint,
        database: StorageQuotaDatabase = this.prisma,
    ): Promise<void> {
        const bytes = this.normalizeByteCount(byteCount);
        if (bytes === 0n) return;

        await this.ensureUsageRow(database, userId);
        await database.$executeRaw(Prisma.sql`
            UPDATE "user_storage_usages"
            SET
                "used_bytes" = GREATEST("used_bytes" - ${bytes}, 0),
                "updated_at" = CURRENT_TIMESTAMP
            WHERE "user_id" = ${userId}
        `);
    }

    private async ensureUsageRow(
        database: StorageQuotaDatabase,
        userId: number,
    ): Promise<void> {
        await database.$executeRaw(Prisma.sql`
            INSERT INTO "user_storage_usages" (
                "user_id",
                "used_bytes",
                "updated_at"
            ) VALUES (${userId}, 0, CURRENT_TIMESTAMP)
            ON CONFLICT ("user_id") DO NOTHING
        `);
    }

    private normalizeByteCount(value: number | bigint): bigint {
        if (typeof value === 'bigint') {
            if (value < 0n) throw new RangeError('Размер файла не может быть отрицательным');
            return value;
        }
        if (!Number.isSafeInteger(value) || value < 0) {
            throw new RangeError('Размер файла должен быть неотрицательным целым числом');
        }
        return BigInt(value);
    }
}
