import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
    it('returns available platform counters and safe zeros', async () => {
        const prisma = {
            user: {
                count: vi.fn()
                    .mockResolvedValueOnce(10)
                    .mockResolvedValueOnce(5)
                    .mockResolvedValueOnce(3)
                    .mockResolvedValueOnce(2)
                    .mockResolvedValueOnce(1),
            },
            teacherProfile: {
                count: vi.fn().mockResolvedValue(2),
            },
            teacherStudentRequest: {
                count: vi.fn().mockResolvedValue(4),
            },
            lesson: {
                count: vi.fn().mockResolvedValue(6),
            },
            homework: {
                count: vi.fn().mockResolvedValue(7),
            },
            review: {
                count: vi.fn().mockResolvedValue(3),
            },
            learningMaterial: {
                count: vi.fn().mockResolvedValue(8),
            },
            materialReport: {
                count: vi.fn().mockResolvedValue(9),
            },
            message: {
                count: vi.fn().mockResolvedValue(12),
            },
            messageReport: {
                count: vi.fn().mockResolvedValue(2),
            },
        } as unknown as PrismaService;
        const service = new AdminDashboardService(prisma);

        const result = await service.stats();

        expect(result).toEqual({
            success: true,
            data: {
                users_total: 10,
                students_total: 5,
                teachers_total: 3,
                admins_total: 2,
                blocked_users_total: 1,
                teachers_new_total: 2,
                requests_pending_total: 4,
                lessons_planned_total: 6,
                homework_assigned_total: 7,
                messages_total: 12,
                reports_new_total: 11,
                message_reports_pending_total: 2,
                reviews_pending_total: 3,
                materials_pending_total: 8,
                material_reports_pending_total: 9,
                payments_paid_total: 0,
                payouts_pending_total: 0,
            },
        });
    });
});
