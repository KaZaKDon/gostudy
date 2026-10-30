import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { LessonSessionStatus, LessonStatus, UserRole, UserStatus } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { HomeworkService } from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherFinanceService } from '../teacher-finance/teacher-finance.service';
import { ClassroomFileStorageService } from './classroom-file-storage.service';
import { ClassroomRealtimeService } from './classroom-realtime.service';
import { ClassroomService } from './classroom.service';

const teacher: SessionUser = {
    id: 7, role: UserRole.TEACHER, email: 'teacher@example.com', fullName: null,
    phone: null, avatarUrl: null, status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(), profileCompleted: true,
};
const lesson = {
    id: 12, teacherId: 7, studentId: 9, lessonDate: new Date(), durationMinutes: 60,
    status: LessonStatus.ACTIVE, session: { status: LessonSessionStatus.ACTIVE },
};

function setup(record: unknown = lesson) {
    const findFirst = vi.fn().mockResolvedValue(record);
    const service = new ClassroomService(
        { lesson: { findFirst } } as unknown as PrismaService,
        {} as NotificationsService, {} as ClassroomFileStorageService,
        {} as HomeworkService, {} as ClassroomRealtimeService, {} as TeacherFinanceService,
    );
    return { service, findFirst };
}

describe('classroom media access', () => {
    it('authorizes an active participant through the same lesson ownership filter', async () => {
        const { service, findFirst } = setup();
        await expect(service.authorizeMedia(teacher, 12)).resolves.toBeUndefined();
        expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 12, OR: [{ teacherId: 7 }, { studentId: 7 }] },
        }));
    });

    it('rejects a lesson outside the authenticated user scope', async () => {
        await expect(setup(null).service.authorizeMedia(teacher, 12))
            .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects parent access before loading a lesson', async () => {
        const { service, findFirst } = setup();
        await expect(service.authorizeMedia({ ...teacher, role: UserRole.PARENT }, 12))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(findFirst).not.toHaveBeenCalled();
    });

    it.each([
        { ...lesson, status: LessonStatus.CANCELLED },
        { ...lesson, status: LessonStatus.COMPLETED },
        { ...lesson, session: { status: LessonSessionStatus.ENDED } },
        { ...lesson, session: { status: LessonSessionStatus.WAITING } },
    ])('rejects an inactive classroom: %j', async (record) => {
        await expect(setup(record).service.authorizeMedia(teacher, 12))
            .rejects.toBeInstanceOf(ConflictException);
    });
});
