import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    PayloadTooLargeException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    LessonSessionStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { ClassroomRealtimeService } from './classroom-realtime.service';
import type { ClassroomBoardQueryDto } from './dto/classroom-board-query.dto';
import type { ClassroomBoardStrokeDto } from './dto/classroom-board-stroke.dto';
import type { ClassroomBoardTextDto, ClassroomBoardTextUpdateDto } from './dto/classroom-board-text.dto';

const MAX_BOARD_STROKES = 2_000;
const MAX_BOARD_TEXTS = 100;

@Injectable()
export class ClassroomBoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly realtime: ClassroomRealtimeService,
    ) {}

    async getState(user: SessionUser, input: ClassroomBoardQueryDto) {
        await this.requireLessonParticipant(user, input.lesson_id, false);
        const [strokes, texts] = await Promise.all([
            this.prisma.lessonBoardStroke.findMany({
            where: {
                lessonId: input.lesson_id,
                id: { gt: input.after_id },
            },
            orderBy: { id: 'asc' },
            take: MAX_BOARD_STROKES,
            }),
            this.prisma.lessonBoardText.findMany({
                where: { lessonId: input.lesson_id },
                orderBy: { id: 'asc' },
                take: MAX_BOARD_TEXTS,
            }),
        ]);

        return {
            success: true,
            strokes: strokes.map((stroke) => ({
                id: stroke.id,
                author_id: stroke.authorId,
                color: stroke.color,
                width: stroke.width,
                points: stroke.points,
            })),
            texts: texts.map((text) => this.serializeText(text)),
        };
    }

    async addText(user: SessionUser, input: ClassroomBoardTextDto) {
        await this.requireLessonParticipant(user, input.lesson_id, true);
        const count = await this.prisma.lessonBoardText.count({ where: { lessonId: input.lesson_id } });
        if (count >= MAX_BOARD_TEXTS) {
            throw new PayloadTooLargeException('На доске достигнут лимит текстовых блоков');
        }
        const text = await this.prisma.lessonBoardText.create({
            data: {
                lessonId: input.lesson_id,
                authorId: user.id,
                content: input.content.trim(),
                color: input.color,
                x: input.x,
                y: input.y,
            },
        });
        this.realtime.publish(input.lesson_id, 'board', { action: 'text' });
        return { success: true, text: this.serializeText(text) };
    }

    async updateText(user: SessionUser, id: number, input: ClassroomBoardTextUpdateDto) {
        await this.requireLessonParticipant(user, input.lesson_id, true);
        const existing = await this.prisma.lessonBoardText.findFirst({
            where: { id, lessonId: input.lesson_id },
        });
        if (!existing) throw new NotFoundException('Текстовый блок не найден');
        if (existing.authorId !== user.id && user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Редактировать текст может его автор или преподаватель');
        }
        const text = await this.prisma.lessonBoardText.update({
            where: { id },
            data: { content: input.content.trim(), color: input.color, x: input.x, y: input.y },
        });
        this.realtime.publish(input.lesson_id, 'board', { action: 'text' });
        return { success: true, text: this.serializeText(text) };
    }

    async deleteText(user: SessionUser, lessonId: number, id: number) {
        await this.requireLessonParticipant(user, lessonId, true);
        const existing = await this.prisma.lessonBoardText.findFirst({ where: { id, lessonId } });
        if (!existing) throw new NotFoundException('Текстовый блок не найден');
        if (existing.authorId !== user.id && user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Удалить текст может его автор или преподаватель');
        }
        await this.prisma.lessonBoardText.delete({ where: { id } });
        this.realtime.publish(lessonId, 'board', { action: 'text' });
        return { success: true };
    }

    async addStroke(user: SessionUser, input: ClassroomBoardStrokeDto) {
        await this.requireLessonParticipant(user, input.lesson_id, true);
        const count = await this.prisma.lessonBoardStroke.count({
            where: { lessonId: input.lesson_id },
        });

        if (count >= MAX_BOARD_STROKES) {
            throw new PayloadTooLargeException(
                'На доске достигнут лимит штрихов. Преподаватель может очистить её.',
            );
        }

        const stroke = await this.prisma.lessonBoardStroke.create({
            data: {
                lessonId: input.lesson_id,
                authorId: user.id,
                color: input.color,
                width: input.width,
                points: input.points as unknown as Prisma.InputJsonValue,
            },
        });
        this.realtime.publish(input.lesson_id, 'board', { action: 'stroke' });

        return {
            success: true,
            stroke: {
                id: stroke.id,
                author_id: stroke.authorId,
                color: stroke.color,
                width: stroke.width,
                points: stroke.points,
            },
        };
    }

    async clear(user: SessionUser, lessonId: number) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Очистить доску может только преподаватель');
        }

        await this.requireLessonParticipant(user, lessonId, true);
        await this.prisma.$transaction([
            this.prisma.lessonBoardStroke.deleteMany({ where: { lessonId } }),
            this.prisma.lessonBoardText.deleteMany({ where: { lessonId } }),
        ]);
        this.realtime.publish(lessonId, 'board', { action: 'clear' });

        return { success: true, strokes: [] };
    }

    private serializeText(text: { id: number; authorId: number; content: string; color: string; x: number; y: number }) {
        return { id: text.id, author_id: text.authorId, content: text.content, color: text.color, x: text.x, y: text.y };
    }

    private async requireLessonParticipant(
        user: SessionUser,
        lessonId: number,
        requireActive: boolean,
    ) {
        if (
            user.role !== UserRole.TEACHER
            && user.role !== UserRole.STUDENT
        ) {
            throw new ForbiddenException('Доска доступна только участникам урока');
        }

        const lesson = await this.prisma.lesson.findFirst({
            where: {
                id: lessonId,
                ...(user.role === UserRole.TEACHER
                    ? { teacherId: user.id }
                    : { studentId: user.id }),
            },
            include: { session: true },
        });

        if (!lesson) {
            throw new NotFoundException('Урок не найден');
        }

        if (
            requireActive
            && lesson.session?.status !== LessonSessionStatus.ACTIVE
        ) {
            throw new ConflictException('Рисовать можно только во время урока');
        }

        return lesson;
    }
}
