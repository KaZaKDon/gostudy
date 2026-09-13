import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherDashboardService } from './teacher-dashboard.service';

const teacher: SessionUser = {
    id: 7,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Анна Учитель',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('TeacherDashboardService', () => {
    it('returns real teacher counters', async () => {
        const prisma = {
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({ timezone: 'Europe/Moscow' }),
            },
            teacherStudent: { count: vi.fn().mockResolvedValue(3) },
            lesson: { count: vi.fn().mockResolvedValue(2) },
            homeworkSubmission: { count: vi.fn().mockResolvedValue(4) },
        } as unknown as PrismaService;
        const service = new TeacherDashboardService(prisma);

        await expect(service.stats(teacher)).resolves.toMatchObject({
            stats: [
                { label: 'учеников', value: 3 },
                { label: 'уроков сегодня', value: 2 },
                { label: 'работ на проверке', value: 4 },
            ],
        });
    });

    it('rejects a non-teacher account', async () => {
        const service = new TeacherDashboardService({} as PrismaService);

        await expect(service.stats({ ...teacher, role: UserRole.STUDENT }))
            .rejects.toBeInstanceOf(ForbiddenException);
    });
});
