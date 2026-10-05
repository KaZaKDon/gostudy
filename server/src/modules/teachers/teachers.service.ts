import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { publicTeacherProfileWhere } from '../../common/access/teacher-publication-policy';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    TeacherStudentRequestStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { SendTeacherRequestDto } from './dto/send-teacher-request.dto';
import { TeacherApplicantAccessService } from './teacher-applicant-access.service';

@Injectable()
export class TeachersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly applicantAccess: TeacherApplicantAccessService,
    ) {}

    async sendRequest(
        user: SessionUser,
        input: SendTeacherRequestDto,
    ): Promise<Record<string, unknown>> {
        this.applicantAccess.assertCanBrowse(user);
        const message = input.message?.trim() || null;

        return this.prisma.$transaction(async (transaction) => {
            const studentId = await this.applicantAccess
                .resolveRequiredStudentId(
                    transaction,
                    user,
                    input.student_id,
                );
            const applicantName = user.role === UserRole.PARENT
                ? await this.studentName(transaction, studentId)
                : user.fullName || 'Ученик';
            const teacher = await transaction.teacherProfile.findFirst({
                where: {
                    userId: input.teacher_id,
                    ...publicTeacherProfileWhere({
                        teacherSubjects: {
                            some: {
                                subjectId: input.subject_id,
                                subject: { isActive: true },
                            },
                        },
                    }),
                },
                select: {
                    userId: true,
                    user: {
                        select: {
                            teacherSubjects: {
                                where: { subjectId: input.subject_id },
                                take: 1,
                                select: {
                                    subject: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (!teacher) {
                throw new NotFoundException(
                    'Преподаватель или выбранный предмет недоступен',
                );
            }

            const activeRelation = await transaction.teacherStudent.findUnique({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: input.teacher_id,
                        studentId,
                        subjectId: input.subject_id,
                    },
                },
            });

            if (activeRelation?.status === TeacherStudentStatus.ACTIVE) {
                throw new ConflictException(
                    'Этот преподаватель уже ведёт у вас выбранный предмет',
                );
            }

            const existing = await transaction.teacherStudentRequest.findUnique({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: input.teacher_id,
                        studentId,
                        subjectId: input.subject_id,
                    },
                },
            });
            const subjectName = teacher.user.teacherSubjects[0]
                ?.subject.name ?? 'выбранному предмету';

            if (existing?.status === TeacherStudentRequestStatus.PENDING) {
                await this.notifications.create(transaction, {
                    userId: input.teacher_id,
                    type: 'teacher_request',
                    title: 'Новая заявка на обучение',
                    message: `${applicantName} — заявка по предмету «${subjectName}»${user.role === UserRole.PARENT ? ` от родителя ${user.fullName || ''}` : ''}.`,
                    targetSection: 'students',
                    targetEntityType: 'teacher_request',
                    targetEntityId: existing.id,
                    dedupeKey: `teacher-request:${existing.id}`,
                });

                return {
                    success: true,
                    message: 'Заявка уже отправлена преподавателю',
                    request: {
                        id: existing.id,
                        status: 'pending',
                    },
                };
            }

            const request = await transaction.teacherStudentRequest.upsert({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: input.teacher_id,
                        studentId,
                        subjectId: input.subject_id,
                    },
                },
                update: {
                    message,
                    status: TeacherStudentRequestStatus.PENDING,
                },
                create: {
                    teacherId: input.teacher_id,
                    studentId,
                    subjectId: input.subject_id,
                    message,
                },
            });

            await this.notifications.create(transaction, {
                userId: input.teacher_id,
                type: 'teacher_request',
                title: 'Новая заявка на обучение',
                message: `${applicantName} — заявка по предмету «${subjectName}»${user.role === UserRole.PARENT ? ` от родителя ${user.fullName || ''}` : ''}.`,
                targetSection: 'students',
                targetEntityType: 'teacher_request',
                targetEntityId: request.id,
                dedupeKey: `teacher-request:${request.id}`,
            });

            return {
                success: true,
                message: 'Заявка отправлена преподавателю',
                request: {
                    id: request.id,
                    status: request.status.toLowerCase(),
                },
            };
        }, { isolationLevel: 'Serializable' });
    }

    private async studentName(
        database: Prisma.TransactionClient,
        studentId: number,
    ): Promise<string> {
        const student = await database.user.findUnique({
            where: { id: studentId },
            select: { fullName: true },
        });
        return student?.fullName || 'Ученик';
    }
}
