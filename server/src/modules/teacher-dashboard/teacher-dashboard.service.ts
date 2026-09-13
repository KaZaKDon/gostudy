import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    HomeworkSubmissionStatus,
    LessonStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import {
    addCalendarDays,
    formatInTimezone,
    parseCalendarDate,
    resolveTimezone,
    zonedDateTimeToUtc,
} from '../schedule/schedule-time';

@Injectable()
export class TeacherDashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async stats(user: SessionUser) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Сводка доступна только преподавателю');
        }

        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId: user.id },
            select: { timezone: true },
        });
        const timezone = resolveTimezone(profile?.timezone);
        const localDate = formatInTimezone(new Date(), timezone)?.slice(0, 10);
        const today = parseCalendarDate(localDate || '');

        if (!today) {
            throw new Error('Не удалось определить текущую дату преподавателя');
        }

        const tomorrow = addCalendarDays(today, 1);
        const dayStart = zonedDateTimeToUtc(today, timezone);
        const dayEnd = zonedDateTimeToUtc(tomorrow, timezone);
        const [students, lessonsToday, homeworkToReview] = await Promise.all([
            this.prisma.teacherStudent.count({
                where: { teacherId: user.id, status: TeacherStudentStatus.ACTIVE },
            }),
            this.prisma.lesson.count({
                where: {
                    teacherId: user.id,
                    lessonDate: { gte: dayStart, lt: dayEnd },
                    status: { not: LessonStatus.CANCELLED },
                },
            }),
            this.prisma.homeworkSubmission.count({
                where: {
                    status: HomeworkSubmissionStatus.SUBMITTED,
                    homework: { teacherId: user.id },
                },
            }),
        ]);

        return {
            success: true,
            stats: [
                { label: 'учеников', value: students },
                { label: 'уроков сегодня', value: lessonsToday },
                { label: 'работ на проверке', value: homeworkToReview },
            ],
        };
    }
}
