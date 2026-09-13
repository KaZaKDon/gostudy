import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonSessionStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { ClassroomBoardService } from './classroom-board.service';
import { ClassroomRealtimeService } from './classroom-realtime.service';

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

const student: SessionUser = {
    ...teacher,
    id: 9,
    role: UserRole.STUDENT,
    email: 'student@example.com',
};

describe('ClassroomBoardService', () => {
    it('stores a text block and publishes a board event', async () => {
        const text = {
            id: 5,
            lessonId: 12,
            authorId: 7,
            content: 'Формула урока',
            color: '#24527a',
            x: 0.2,
            y: 0.3,
        };
        const prisma = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 12,
                    session: { status: LessonSessionStatus.ACTIVE },
                }),
            },
            lessonBoardText: {
                count: vi.fn().mockResolvedValue(0),
                create: vi.fn().mockResolvedValue(text),
            },
        } as unknown as PrismaService;
        const realtime = { publish: vi.fn() } as unknown as ClassroomRealtimeService;
        const service = new ClassroomBoardService(prisma, realtime);

        const result = await service.addText(teacher, {
            lesson_id: 12,
            content: text.content,
            color: text.color,
            x: text.x,
            y: text.y,
        });

        expect(result.text).toMatchObject({ id: 5, author_id: 7 });
        expect(realtime.publish).toHaveBeenCalledWith(12, 'board', { action: 'text' });
    });

    it('does not let a student edit another author text', async () => {
        const prisma = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 12,
                    session: { status: LessonSessionStatus.ACTIVE },
                }),
            },
            lessonBoardText: {
                findFirst: vi.fn().mockResolvedValue({ id: 5, lessonId: 12, authorId: 7 }),
            },
        } as unknown as PrismaService;
        const service = new ClassroomBoardService(
            prisma,
            {} as ClassroomRealtimeService,
        );

        await expect(service.updateText(student, 5, {
            lesson_id: 12,
            content: 'Чужой текст',
            color: '#2d2926',
            x: 0.4,
            y: 0.5,
        })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('stores a stroke and publishes a board event', async () => {
        const stroke = {
            id: 4,
            lessonId: 12,
            authorId: 7,
            color: '#2d2926',
            width: 4,
            points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
            createdAt: new Date(),
        };
        const prisma = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 12,
                    session: { status: LessonSessionStatus.ACTIVE },
                }),
            },
            lessonBoardStroke: {
                count: vi.fn().mockResolvedValue(0),
                create: vi.fn().mockResolvedValue(stroke),
            },
        } as unknown as PrismaService;
        const realtime = {
            publish: vi.fn(),
        } as unknown as ClassroomRealtimeService;
        const service = new ClassroomBoardService(prisma, realtime);

        const result = await service.addStroke(teacher, {
            lesson_id: 12,
            color: '#2d2926',
            width: 4,
            points: stroke.points,
        });

        expect(result.stroke).toMatchObject({ id: 4, author_id: 7 });
        expect(realtime.publish).toHaveBeenCalledWith(
            12,
            'board',
            { action: 'stroke' },
        );
    });

    it('does not let a student clear the board', async () => {
        const service = new ClassroomBoardService(
            {} as PrismaService,
            {} as ClassroomRealtimeService,
        );

        await expect(service.clear(student, 12))
            .rejects.toBeInstanceOf(ForbiddenException);
    });
});
