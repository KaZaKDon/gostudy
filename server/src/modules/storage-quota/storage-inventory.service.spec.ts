import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { StorageInventoryService } from './storage-inventory.service';

function asLatin1Mojibake(value: string): string {
    return Buffer.from(value, 'utf8').toString('latin1');
}

function sessionUser(role: UserRole): SessionUser {
    return {
        id: 17,
        role,
        email: 'user@example.test',
        fullName: 'Test User',
        phone: null,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        profileCompleted: true,
    };
}

function createService(categoryRows: unknown[], fileRows: unknown[]) {
    const prisma = {
        $queryRaw: vi.fn()
            .mockResolvedValueOnce(categoryRows)
            .mockResolvedValueOnce(fileRows),
    } as unknown as PrismaService;

    return {
        prisma,
        service: new StorageInventoryService(prisma),
    };
}

describe('StorageInventoryService', () => {
    it('returns teacher categories and serializes the largest files', async () => {
        const { service } = createService(
            [{ category: 'profile', used_bytes: 1_024n, file_count: 2n }],
            [{
                source_type: 'profile_photo',
                file_id: 9,
                category: 'profile',
                original_name: 'portrait.jpg',
                file_size: 768n,
                created_at: new Date('2026-09-24T08:00:00.000Z'),
                entity_id: 9,
                context_title: 'Фотография профиля',
            }],
        );

        await expect(service.getInventory(sessionUser(UserRole.TEACHER)))
            .resolves.toEqual({
                categories: [
                    { id: 'profile', used_bytes: 1_024, file_count: 2 },
                    { id: 'documents', used_bytes: 0, file_count: 0 },
                    { id: 'messages', used_bytes: 0, file_count: 0 },
                    { id: 'homework', used_bytes: 0, file_count: 0 },
                    { id: 'classroom', used_bytes: 0, file_count: 0 },
                    { id: 'disputes', used_bytes: 0, file_count: 0 },
                    { id: 'materials', used_bytes: 0, file_count: 0 },
                ],
                largest_files: [{
                    id: 'profile_photo:9',
                    file_id: 9,
                    source_type: 'profile_photo',
                    category: 'profile',
                    name: 'portrait.jpg',
                    size_bytes: 768,
                    created_at: '2026-09-24T08:00:00.000Z',
                    entity_id: 9,
                    context_title: 'Фотография профиля',
                }],
            });
    });

    it('shows only relevant empty categories to a student', async () => {
        const { service } = createService([], []);

        const result = await service.getInventory(
            sessionUser(UserRole.STUDENT),
        );

        expect(result.categories).toEqual([
            { id: 'messages', used_bytes: 0, file_count: 0 },
            { id: 'homework', used_bytes: 0, file_count: 0 },
            { id: 'disputes', used_bytes: 0, file_count: 0 },
        ]);
    });

    it('queries only teacher-owned library materials', async () => {
        const { prisma, service } = createService([], []);

        await service.getInventory(sessionUser(UserRole.TEACHER));

        const query = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as {
            sql: string;
        };
        expect(query.sql).toContain('material."owner_type" = \'TEACHER\'');
    });

    it('repairs a legacy mojibake filename in the inventory', async () => {
        const originalName = '22 августа.docx';
        const { service } = createService([], [{
            source_type: 'classroom_file',
            file_id: 19,
            category: 'classroom',
            original_name: asLatin1Mojibake(originalName),
            file_size: 2_048n,
            created_at: new Date('2026-09-24T09:00:00.000Z'),
            entity_id: 31,
            context_title: null,
        }]);

        const result = await service.getInventory(
            sessionUser(UserRole.TEACHER),
        );

        expect(result.largest_files[0].name).toBe(originalName);
        expect(result.largest_files[0]).toMatchObject({
            file_id: 19,
            entity_id: 31,
        });
    });
});
