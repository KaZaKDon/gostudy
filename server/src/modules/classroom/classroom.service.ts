import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    PayloadTooLargeException,
} from '@nestjs/common';

import { normalizeUploadedFileName } from '../../common/files/upload-file-name';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    LessonSessionStatus,
    LessonStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { HomeworkService } from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
    formatInTimezone,
    resolveTimezone,
} from '../schedule/schedule-time';
import {
    calculateClassroomAccess,
    type ClassroomAccess,
    isClassroomParticipantPresent,
} from './classroom-access';
import {
    ClassroomFileStorageService,
    type ClassroomUploadFile,
} from './classroom-file-storage.service';
import type { ClassroomFileDto } from './dto/classroom-file.dto';
import type { SaveClassroomNoteDto } from './dto/save-classroom-note.dto';
import type { SendClassroomMessageDto } from './dto/send-classroom-message.dto';
import type { ShareClassroomMaterialDto } from './dto/share-classroom-material.dto';
import type { SyncClassroomDto } from './dto/sync-classroom.dto';

const INITIAL_MESSAGE_LIMIT = 100;
const SYNC_MESSAGE_LIMIT = 100;

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ClassroomService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly fileStorage: ClassroomFileStorageService,
        private readonly homework: HomeworkService,
    ) {}

    async show(user: SessionUser, lessonId: number) {
        this.requireParticipantRole(user);
        const lesson = await this.findLesson(this.prisma, lessonId, user);
        const timezone = await this.getViewerTimezone(user);
        const [relation, messages, files, workspace, homework] = await Promise.all([
            this.findRelation(lesson),
            this.loadMessages(
                lesson.id,
                user.id,
                timezone,
                0,
                INITIAL_MESSAGE_LIMIT,
            ),
            this.loadFiles(lesson.id),
            this.prisma.lessonWorkspaceState.findUnique({
                where: { lessonId: lesson.id },
            }),
            this.homework.listForLesson(user, lesson.id),
        ]);
        const access = this.accessFor(lesson, user);

        return {
            success: true,
            viewer: {
                id: user.id,
                role: user.role.toLowerCase(),
                name: user.fullName || (user.role === UserRole.TEACHER
                    ? 'Преподаватель'
                    : 'Ученик'),
            },
            lesson: this.serializeLesson(lesson, relation?.id ?? null, timezone),
            session: this.serializeSession(lesson.session, lesson.status, timezone),
            access: this.serializeAccess(access, timezone),
            workspace: this.serializeWorkspace(workspace),
            messages,
            files: files.map((file) => this.serializeFile(file, timezone)),
            homework,
            teacher_note: user.role === UserRole.TEACHER
                ? lesson.result?.teacherNote ?? ''
                : null,
            upload_limits: this.serializeUploadLimits(),
            timezone,
        };
    }

    async sync(user: SessionUser, input: SyncClassroomDto) {
        this.requireParticipantRole(user);
        const state = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, input.lesson_id, user);
            let session = lesson.session;
            let access = this.accessFor(lesson, user);

            if (access.canJoin) {
                session = await this.ensureSession(transaction, lesson.id);
                session = await this.touchPresence(transaction, session, user.role);
                access = calculateClassroomAccess({
                    lessonDate: lesson.lessonDate,
                    durationMinutes: lesson.durationMinutes,
                    lessonStatus: lesson.status,
                    sessionStatus: session.status,
                    role: user.role,
                });
            }

            return { lesson, session, access };
        });
        const timezone = await this.getViewerTimezone(user);
        const [workspace, files, messages, homework] = await Promise.all([
            this.prisma.lessonWorkspaceState.findUnique({
                where: { lessonId: input.lesson_id },
            }),
            this.loadFiles(input.lesson_id),
            this.loadMessages(
                input.lesson_id,
                user.id,
                timezone,
                input.after_message_id,
                SYNC_MESSAGE_LIMIT,
            ),
            this.homework.listForLesson(user, input.lesson_id),
        ]);

        return {
            success: true,
            session: this.serializeSession(
                state.session,
                state.lesson.status,
                timezone,
            ),
            access: this.serializeAccess(state.access, timezone),
            workspace: this.serializeWorkspace(workspace),
            files: files.map((file) => this.serializeFile(file, timezone)),
            messages,
            homework,
        };
    }

    async start(user: SessionUser, lessonId: number) {
        this.requireTeacher(user, 'Начать урок может только преподаватель');
        const state = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, lessonId, user);
            const currentAccess = this.accessFor(lesson, user);
            let session = lesson.session;

            if (
                lesson.status === LessonStatus.CANCELLED
                || lesson.status === LessonStatus.COMPLETED
                || session?.status === LessonSessionStatus.ENDED
            ) {
                throw new ConflictException(
                    currentAccess.reason || 'Сейчас этот урок нельзя начать',
                );
            }

            if (session?.status === LessonSessionStatus.ACTIVE) {
                session = await this.touchPresence(transaction, session, user.role);
            } else {
                if (!currentAccess.canStart) {
                    throw new ConflictException(
                        currentAccess.reason || 'Сейчас этот урок нельзя начать',
                    );
                }

                const now = new Date();
                session = await transaction.lessonSession.upsert({
                    where: { lessonId },
                    create: {
                        lessonId,
                        status: LessonSessionStatus.ACTIVE,
                        startedById: user.id,
                        startedAt: now,
                        teacherJoinedAt: now,
                        teacherLastSeenAt: now,
                    },
                    update: {
                        status: LessonSessionStatus.ACTIVE,
                        startedById: user.id,
                        startedAt: lesson.session?.startedAt ?? now,
                        teacherJoinedAt: lesson.session?.teacherJoinedAt ?? now,
                        teacherLastSeenAt: now,
                    },
                });
            }

            return { lesson, session };
        });
        const timezone = await this.getViewerTimezone(user);
        const access = calculateClassroomAccess({
            lessonDate: state.lesson.lessonDate,
            durationMinutes: state.lesson.durationMinutes,
            lessonStatus: state.lesson.status,
            sessionStatus: state.session.status,
            role: user.role,
        });

        return {
            success: true,
            message: 'Урок начат',
            session: this.serializeSession(state.session, state.lesson.status, timezone),
            access: this.serializeAccess(access, timezone),
        };
    }

    async finish(user: SessionUser, lessonId: number) {
        this.requireTeacher(user, 'Завершить урок может только преподаватель');
        const state = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, lessonId, user);
            let session = lesson.session;

            if (lesson.status === LessonStatus.CANCELLED) {
                throw new ConflictException('Отменённый урок нельзя завершить');
            }

            if (session?.status !== LessonSessionStatus.ENDED) {
                if (!session || session.status !== LessonSessionStatus.ACTIVE) {
                    throw new ConflictException('Сначала начните урок');
                }

                const now = new Date();
                session = await transaction.lessonSession.update({
                    where: { lessonId },
                    data: {
                        status: LessonSessionStatus.ENDED,
                        endedById: user.id,
                        endedAt: session.endedAt ?? now,
                        teacherLastSeenAt: now,
                    },
                });
            }

            const completedLesson = await transaction.lesson.update({
                where: { id: lessonId },
                data: { status: LessonStatus.COMPLETED },
                include: {
                    teacher: { select: { fullName: true, avatarUrl: true } },
                    student: { select: { fullName: true, avatarUrl: true } },
                    subject: { select: { name: true } },
                    session: true,
                    result: true,
                },
            });
            await transaction.lessonWorkspaceState.updateMany({
                where: { lessonId, isSharing: true },
                data: {
                    isSharing: false,
                    sharedFileId: null,
                    sharedPage: 1,
                    updatedById: user.id,
                    version: { increment: 1 },
                },
            });
            await this.notifications.create(transaction, {
                userId: lesson.studentId,
                type: 'lesson_completed',
                title: 'Урок завершён',
                message: `${lesson.subject?.name || lesson.title || 'Занятие'} — теперь можно оставить отзыв`,
                targetSection: 'teachers',
                targetEntityType: 'lesson',
                targetEntityId: lessonId,
                dedupeKey: `lesson-completed:${lessonId}`,
            });

            return { lesson: completedLesson, session };
        });
        const timezone = await this.getViewerTimezone(user);
        const workspace = await this.prisma.lessonWorkspaceState.findUnique({
            where: { lessonId },
        });
        const access = calculateClassroomAccess({
            lessonDate: state.lesson.lessonDate,
            durationMinutes: state.lesson.durationMinutes,
            lessonStatus: LessonStatus.COMPLETED,
            sessionStatus: LessonSessionStatus.ENDED,
            role: user.role,
        });

        return {
            success: true,
            message: 'Урок завершён',
            session: this.serializeSession(state.session, LessonStatus.COMPLETED, timezone),
            access: this.serializeAccess(access, timezone),
            workspace: this.serializeWorkspace(workspace),
        };
    }

    async sendMessage(user: SessionUser, input: SendClassroomMessageDto) {
        this.requireParticipantRole(user);
        const messageText = input.message_text.trim();
        if (!messageText) {
            throw new BadRequestException('Введите сообщение');
        }

        const message = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, input.lesson_id, user);
            const access = this.accessFor(lesson, user);
            if (!access.canChat) {
                throw new ConflictException(
                    access.reason || 'Чат урока недоступен',
                );
            }

            let session = await this.ensureSession(transaction, lesson.id);
            session = await this.touchPresence(transaction, session, user.role);
            return transaction.lessonMessage.create({
                data: {
                    lessonId: lesson.id,
                    senderId: user.id,
                    messageText,
                },
                include: {
                    sender: { select: { fullName: true, role: true } },
                },
            });
        });
        const timezone = await this.getViewerTimezone(user);

        return {
            success: true,
            message: this.serializeMessage(message, timezone, user.id),
        };
    }

    async saveNote(user: SessionUser, input: SaveClassroomNoteDto) {
        this.requireTeacher(user, 'Личные заметки доступны только преподавателю');
        const lesson = await this.findLesson(this.prisma, input.lesson_id, user);
        if (lesson.status === LessonStatus.CANCELLED) {
            throw new ConflictException(
                'Для отменённого урока нельзя сохранить заметку',
            );
        }
        const noteText = input.note_text.trim();

        await this.prisma.lessonResult.upsert({
            where: { lessonId: lesson.id },
            create: {
                lessonId: lesson.id,
                teacherNote: noteText || null,
            },
            update: { teacherNote: noteText || null },
        });

        return {
            success: true,
            message: 'Заметка сохранена',
            teacher_note: noteText,
        };
    }

    async uploadFiles(
        user: SessionUser,
        lessonId: number,
        files: ClassroomUploadFile[],
    ) {
        this.requireTeacher(user, 'Добавлять материалы может только преподаватель');
        const lesson = await this.findLesson(this.prisma, lessonId, user);
        const access = this.accessFor(lesson, user);
        if (!access.canManageFiles) {
            throw new ConflictException(
                access.reason || 'Сейчас материалы нельзя добавить',
            );
        }

        const validated = this.fileStorage.validateUploads(files);
        const incomingBytes = validated.reduce(
            (sum, item) => sum + item.file.size,
            0,
        );
        const currentSize = await this.prisma.lessonFile.aggregate({
            where: { lessonId },
            _sum: { fileSize: true },
        });
        if (
            Number(currentSize._sum.fileSize || 0) + incomingBytes
            > this.fileStorage.limits().lessonMaxBytes
        ) {
            throw new PayloadTooLargeException(
                'Общий размер материалов урока превышает допустимый',
            );
        }

        const stored = await this.fileStorage.storeUploads(lessonId, validated);
        try {
            await this.prisma.lessonFile.createMany({
                data: stored.map((file) => ({
                    lessonId,
                    uploadedById: user.id,
                    storedPath: file.storedPath,
                    originalName: file.originalName,
                    mimeType: file.mimeType,
                    fileSize: file.fileSize,
                })),
            });
        } catch (error) {
            await this.fileStorage.removeStoredPaths(
                stored.map((file) => file.storedPath),
            );
            throw error;
        }

        const timezone = await this.getViewerTimezone(user);
        const savedFiles = await this.loadFiles(lessonId);
        return {
            success: true,
            message: stored.length === 1
                ? 'Материал добавлен'
                : 'Материалы добавлены',
            files: savedFiles.map((file) => this.serializeFile(file, timezone)),
        };
    }

    async deleteFile(user: SessionUser, input: ClassroomFileDto) {
        this.requireTeacher(user, 'Удалять материалы может только преподаватель');
        const storedPath = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, input.lesson_id, user);
            const access = this.accessFor(lesson, user);
            if (!access.canManageFiles) {
                throw new ConflictException(
                    access.reason || 'Сейчас материалы нельзя удалить',
                );
            }

            const file = await transaction.lessonFile.findFirst({
                where: { id: input.file_id, lessonId: lesson.id },
            });
            if (!file) {
                throw new NotFoundException('Материал не найден');
            }
            await transaction.lessonWorkspaceState.updateMany({
                where: { lessonId: lesson.id, sharedFileId: file.id },
                data: {
                    isSharing: false,
                    sharedFileId: null,
                    sharedPage: 1,
                    updatedById: user.id,
                    version: { increment: 1 },
                },
            });
            await transaction.lessonFile.delete({ where: { id: file.id } });
            return file.storedPath;
        });
        await this.fileStorage.removeStoredPaths([storedPath]);
        const timezone = await this.getViewerTimezone(user);
        const [files, workspace] = await Promise.all([
            this.loadFiles(input.lesson_id),
            this.prisma.lessonWorkspaceState.findUnique({
                where: { lessonId: input.lesson_id },
            }),
        ]);

        return {
            success: true,
            message: 'Материал удалён',
            files: files.map((file) => this.serializeFile(file, timezone)),
            workspace: this.serializeWorkspace(workspace),
        };
    }

    async downloadFile(user: SessionUser, fileId: number) {
        this.requireParticipantRole(user);
        const file = await this.prisma.lessonFile.findFirst({
            where: {
                id: fileId,
                lesson: {
                    OR: [
                        { teacherId: user.id },
                        { studentId: user.id },
                    ],
                },
            },
        });
        if (!file) {
            throw new NotFoundException('Материал не найден');
        }
        const stored = await this.fileStorage.readStoredFile(file.storedPath);

        return {
            ...stored,
            originalName: normalizeUploadedFileName(file.originalName),
            mimeType: file.mimeType,
        };
    }

    async shareMaterial(user: SessionUser, input: ShareClassroomMaterialDto) {
        this.requireTeacher(user, 'Управлять показом может только преподаватель');
        const workspace = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, input.lesson_id, user);
            const access = this.accessFor(lesson, user);
            if (!access.canShareMaterial) {
                throw new ConflictException(
                    access.reason || 'Показ доступен только во время урока',
                );
            }
            const file = await transaction.lessonFile.findFirst({
                where: { id: input.file_id, lessonId: lesson.id },
                select: { id: true },
            });
            if (!file) {
                throw new NotFoundException('Материал не найден');
            }
            const current = await transaction.lessonWorkspaceState.findUnique({
                where: { lessonId: lesson.id },
            });
            const nextVersion = (current?.version ?? 0) + (
                !current?.isSharing || current.sharedFileId !== file.id ? 1 : 0
            );

            return transaction.lessonWorkspaceState.upsert({
                where: { lessonId: lesson.id },
                create: {
                    lessonId: lesson.id,
                    isSharing: true,
                    sharedFileId: file.id,
                    sharedPage: input.page,
                    updatedById: user.id,
                    version: 1,
                },
                update: {
                    isSharing: true,
                    sharedFileId: file.id,
                    sharedPage: input.page,
                    updatedById: user.id,
                    version: nextVersion,
                },
            });
        });

        return {
            success: true,
            message: 'Материал показан ученику',
            workspace: this.serializeWorkspace(workspace),
        };
    }

    async stopMaterialSharing(user: SessionUser, lessonId: number) {
        this.requireTeacher(user, 'Остановить показ может только преподаватель');
        const workspace = await this.prisma.$transaction(async (transaction) => {
            const lesson = await this.findLesson(transaction, lessonId, user);
            if (lesson.session?.status === LessonSessionStatus.ENDED) {
                throw new ConflictException('Урок уже завершён');
            }
            const current = await transaction.lessonWorkspaceState.findUnique({
                where: { lessonId },
            });

            return transaction.lessonWorkspaceState.upsert({
                where: { lessonId },
                create: {
                    lessonId,
                    isSharing: false,
                    sharedPage: 1,
                    updatedById: user.id,
                    version: 1,
                },
                update: {
                    isSharing: false,
                    sharedFileId: null,
                    sharedPage: 1,
                    updatedById: user.id,
                    version: { increment: 1 },
                },
            });
        });

        return {
            success: true,
            message: 'Показ материала остановлен',
            workspace: this.serializeWorkspace(workspace),
        };
    }

    private async findLesson(
        client: DatabaseClient,
        lessonId: number,
        user: SessionUser,
    ) {
        const lesson = await client.lesson.findFirst({
            where: {
                id: lessonId,
                OR: [
                    { teacherId: user.id },
                    { studentId: user.id },
                ],
            },
            include: {
                teacher: { select: { fullName: true, avatarUrl: true } },
                student: { select: { fullName: true, avatarUrl: true } },
                subject: { select: { name: true } },
                session: true,
                result: true,
            },
        });
        if (!lesson) {
            throw new NotFoundException('Урок не найден');
        }
        return lesson;
    }

    private findRelation(lesson: {
        teacherId: number;
        studentId: number;
        subjectId: number | null;
    }) {
        if (!lesson.subjectId) return Promise.resolve(null);
        return this.prisma.teacherStudent.findFirst({
            where: {
                teacherId: lesson.teacherId,
                studentId: lesson.studentId,
                subjectId: lesson.subjectId,
                status: TeacherStudentStatus.ACTIVE,
            },
            select: { id: true },
        });
    }

    private async ensureSession(
        transaction: Prisma.TransactionClient,
        lessonId: number,
    ) {
        return transaction.lessonSession.upsert({
            where: { lessonId },
            create: { lessonId },
            update: {},
        });
    }

    private async touchPresence(
        transaction: Prisma.TransactionClient,
        session: Awaited<ReturnType<ClassroomService['ensureSession']>>,
        role: UserRole,
    ) {
        const now = new Date();
        return transaction.lessonSession.update({
            where: { lessonId: session.lessonId },
            data: role === UserRole.TEACHER
                ? {
                    teacherJoinedAt: session.teacherJoinedAt ?? now,
                    teacherLastSeenAt: now,
                }
                : {
                    studentJoinedAt: session.studentJoinedAt ?? now,
                    studentLastSeenAt: now,
                },
        });
    }

    private accessFor(
        lesson: {
            lessonDate: Date;
            durationMinutes: number;
            status: LessonStatus;
            session: { status: LessonSessionStatus } | null;
        },
        user: SessionUser,
    ): ClassroomAccess {
        return calculateClassroomAccess({
            lessonDate: lesson.lessonDate,
            durationMinutes: lesson.durationMinutes,
            lessonStatus: lesson.status,
            sessionStatus: lesson.session?.status,
            role: user.role,
        });
    }

    private async loadMessages(
        lessonId: number,
        viewerId: number,
        timezone: string,
        afterId: number,
        limit: number,
    ) {
        const messages = await this.prisma.lessonMessage.findMany({
            where: {
                lessonId,
                ...(afterId > 0 ? { id: { gt: afterId } } : {}),
            },
            orderBy: { id: afterId > 0 ? 'asc' : 'desc' },
            take: limit,
            include: {
                sender: { select: { fullName: true, role: true } },
            },
        });
        const ordered = afterId > 0 ? messages : messages.reverse();
        return ordered.map((message) =>
            this.serializeMessage(message, timezone, viewerId));
    }

    private loadFiles(lessonId: number) {
        return this.prisma.lessonFile.findMany({
            where: { lessonId },
            orderBy: { id: 'asc' },
        });
    }

    private serializeLesson(
        lesson: Awaited<ReturnType<ClassroomService['findLesson']>>,
        relationId: number | null,
        timezone: string,
    ) {
        const title = lesson.title || lesson.subject?.name || 'Урок';
        return {
            id: lesson.id,
            teacher_id: lesson.teacherId,
            student_id: lesson.studentId,
            subject_id: lesson.subjectId,
            relation_id: relationId,
            title,
            topic: lesson.lessonTopic?.trim() || title,
            subject_name: lesson.subject?.name || title,
            lesson_date: formatInTimezone(lesson.lessonDate, timezone),
            duration_minutes: lesson.durationMinutes,
            status: lesson.status.toLowerCase(),
            teacher: {
                id: lesson.teacherId,
                name: lesson.teacher.fullName || 'Преподаватель',
                avatar_url: lesson.teacher.avatarUrl,
            },
            student: {
                id: lesson.studentId,
                name: lesson.student.fullName || 'Ученик',
                avatar_url: lesson.student.avatarUrl,
            },
        };
    }

    private serializeSession(
        session: Awaited<ReturnType<ClassroomService['ensureSession']>> | null,
        lessonStatus: LessonStatus,
        timezone: string,
    ) {
        const now = new Date();
        const status = session?.status
            ?? (lessonStatus === LessonStatus.COMPLETED
                ? LessonSessionStatus.ENDED
                : LessonSessionStatus.WAITING);
        const elapsedEnd = session?.endedAt ?? now;
        const elapsedSeconds = session?.startedAt
            ? Math.max(0, Math.floor(
                (elapsedEnd.getTime() - session.startedAt.getTime()) / 1000,
            ))
            : 0;

        return {
            id: session?.id ?? null,
            status: status.toLowerCase(),
            started_at: formatInTimezone(session?.startedAt ?? null, timezone),
            ended_at: formatInTimezone(session?.endedAt ?? null, timezone),
            elapsed_seconds: elapsedSeconds,
            teacher_present: status !== LessonSessionStatus.ENDED
                && isClassroomParticipantPresent(session?.teacherLastSeenAt, now),
            student_present: status !== LessonSessionStatus.ENDED
                && isClassroomParticipantPresent(session?.studentLastSeenAt, now),
        };
    }

    private serializeAccess(access: ClassroomAccess, timezone: string) {
        return {
            can_join: access.canJoin,
            can_start: access.canStart,
            can_finish: access.canFinish,
            can_chat: access.canChat,
            can_manage_files: access.canManageFiles,
            can_share_material: access.canShareMaterial,
            is_read_only: access.isReadOnly,
            reason: access.reason,
            available_at: formatInTimezone(access.availableAt, timezone),
            scheduled_end_at: formatInTimezone(access.scheduledEndAt, timezone),
            start_deadline_at: formatInTimezone(access.startDeadlineAt, timezone),
            entry_advance_minutes: 15,
        };
    }

    private serializeMessage(
        message: {
            id: number;
            senderId: number;
            messageText: string;
            createdAt: Date;
            sender: { fullName: string | null; role: UserRole };
        },
        timezone: string,
        viewerId: number,
    ) {
        return {
            id: message.id,
            sender_id: message.senderId,
            sender_name: message.sender.fullName || 'Пользователь',
            sender_role: message.sender.role.toLowerCase(),
            text: message.messageText,
            created_at: formatInTimezone(message.createdAt, timezone),
            is_own: message.senderId === viewerId,
        };
    }

    private serializeFile(
        file: {
            id: number;
            originalName: string;
            mimeType: string;
            fileSize: number;
            createdAt: Date;
        },
        timezone: string,
    ) {
        return {
            id: file.id,
            original_name: normalizeUploadedFileName(file.originalName),
            mime_type: file.mimeType,
            file_size: file.fileSize,
            created_at: formatInTimezone(file.createdAt, timezone),
        };
    }

    private serializeWorkspace(workspace: {
        isSharing: boolean;
        sharedFileId: number | null;
        sharedPage: number;
        version: number;
        updatedAt: Date;
    } | null) {
        const isSharing = Boolean(workspace?.isSharing && workspace.sharedFileId);
        return {
            is_sharing: isSharing,
            file_id: isSharing ? workspace?.sharedFileId ?? null : null,
            page: isSharing ? Math.max(1, workspace?.sharedPage ?? 1) : 1,
            version: workspace?.version ?? 0,
            updated_at: workspace?.updatedAt ?? null,
        };
    }

    private serializeUploadLimits() {
        const limits = this.fileStorage.limits();
        return {
            max_files: limits.maxFiles,
            max_file_bytes: limits.maxFileBytes,
            max_total_bytes: limits.maxTotalBytes,
            lesson_max_bytes: limits.lessonMaxBytes,
        };
    }

    private async getViewerTimezone(user: SessionUser): Promise<string> {
        if (user.role === UserRole.TEACHER) {
            const profile = await this.prisma.teacherProfile.findUnique({
                where: { userId: user.id },
                select: { timezone: true },
            });
            return resolveTimezone(profile?.timezone);
        }
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: user.id },
            select: { timezone: true },
        });
        return resolveTimezone(profile?.timezone);
    }

    private requireParticipantRole(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER && user.role !== UserRole.STUDENT) {
            throw new ForbiddenException(
                'Класс доступен только преподавателю или ученику',
            );
        }
    }

    private requireTeacher(user: SessionUser, message: string): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(message);
        }
    }
}
