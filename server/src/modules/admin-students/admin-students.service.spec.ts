import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonStatus,
    TeacherStudentRequestStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { AdminStudentsService } from './admin-students.service';

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

function createService() {
    const prisma = {
        user: {
            count: vi.fn().mockResolvedValue(1),
            findMany: vi.fn().mockResolvedValue([{
                id: 8,
                fullName: 'Ученик',
                email: 'student@example.com',
                phone: '+70000000000',
                status: UserStatus.ACTIVE,
                blockedReason: null,
                archiveReason: null,
                emailVerifiedAt: new Date(),
                profileCompleted: true,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                studentProfile: {
                    id: 4,
                    city: 'Новочеркасск',
                    birthYear: 2012,
                    classLevel: '7 класс',
                    subjects: 'Математика',
                    goal: 'Повысить знания',
                    parentName: 'Родитель',
                    parentPhone: '+71111111111',
                    parentEmail: 'parent@example.com',
                    profileCompletion: 100,
                },
                _count: {
                    learningRelations: 1,
                    learningRequests: 2,
                    lessonsAsStudent: 3,
                },
            }]),
            findUnique: vi.fn(),
        },
    } as unknown as PrismaService;

    return {
        service: new AdminStudentsService(prisma),
        prisma,
    };
}

describe('AdminStudentsService', () => {
    it('returns a paginated student list', async () => {
        const { service } = createService();
        const result = await service.list(admin, {
            page: 1,
            limit: 20,
            status: 'active',
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                items: [{
                    id: 8,
                    city: 'Новочеркасск',
                    active_teachers_total: 1,
                    requests_total: 2,
                    lessons_total: 3,
                }],
                pagination: { total: 1, pages: 1 },
            },
        });
    });

    it('returns profile, relations, requests and lessons', async () => {
        const { service, prisma } = createService();
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: 8,
            role: UserRole.STUDENT,
            fullName: 'Ученик',
            email: 'student@example.com',
            phone: '+70000000000',
            avatarUrl: null,
            status: UserStatus.ACTIVE,
            blockedReason: null,
            archivedAt: null,
            archiveReason: null,
            emailVerifiedAt: new Date(),
            profileCompleted: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            studentProfile: {
                id: 4,
                firstName: 'Иван',
                lastName: 'Иванов',
                city: 'Новочеркасск',
                timezone: 'Europe/Moscow',
                birthYear: 2012,
                classLevel: '7 класс',
                subjects: 'Математика',
                goal: 'Повысить знания',
                learningGoals: 'Подготовка к контрольной',
                levelDescription: 'Средний уровень',
                lessonFormat: 'Онлайн',
                parentName: 'Родитель',
                parentPhone: '+71111111111',
                parentEmail: 'parent@example.com',
                messenger: 'Telegram',
                contactPreference: 'Родитель',
                preferredTime: 'После 17:00',
                scheduleComment: null,
                about: null,
                profileVersion: 1,
                profileCompletion: 100,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            learningRelations: [{
                id: 12,
                status: TeacherStudentStatus.ACTIVE,
                startedAt: new Date(),
                archivedAt: null,
                teacher: {
                    id: 2,
                    fullName: 'Преподаватель',
                    email: 'teacher@example.com',
                    phone: null,
                    status: UserStatus.ACTIVE,
                },
                subject: { id: 3, name: 'Математика', slug: 'math' },
            }],
            learningRequests: [{
                id: 14,
                message: 'Хочу заниматься',
                status: TeacherStudentRequestStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
                teacher: {
                    id: 2,
                    fullName: 'Преподаватель',
                    email: 'teacher@example.com',
                    status: UserStatus.ACTIVE,
                },
                subject: { id: 3, name: 'Математика', slug: 'math' },
            }],
            lessonsAsStudent: [{
                id: 16,
                title: 'Знакомство',
                lessonDate: new Date(),
                durationMinutes: 45,
                status: LessonStatus.SCHEDULED,
                lessonTopic: null,
                createdAt: new Date(),
                teacher: {
                    id: 2,
                    fullName: 'Преподаватель',
                    email: 'teacher@example.com',
                },
                subject: { id: 3, name: 'Математика', slug: 'math' },
            }],
            _count: {
                learningRequests: 1,
                lessonsAsStudent: 1,
            },
        } as never);

        const result = await service.show(admin, 8);

        expect(result).toMatchObject({
            success: true,
            data: {
                student: {
                    id: 8,
                    parent_email: 'parent@example.com',
                    profile_completion: 100,
                },
                stats: {
                    teachers_total: 1,
                    requests_total: 1,
                    lessons_total: 1,
                    homework_total: 0,
                    messages_total: 0,
                },
                teachers: [{ teacher_id: 2, status: 'active' }],
                requests: [{ status: 'pending' }],
                lessons: [{ status: 'scheduled' }],
                homework: [],
            },
        });
    });

    it('rejects ordinary users', async () => {
        const { service } = createService();

        await expect(service.list({
            ...admin,
            role: UserRole.STUDENT,
        }, { page: 1, limit: 20 })).rejects.toThrow(
            'Доступ разрешён только администратору или модератору',
        );
    });
});
