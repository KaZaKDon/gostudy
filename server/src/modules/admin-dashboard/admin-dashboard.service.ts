import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    HomeworkStatus,
    LessonStatus,
    MaterialPublicationStatus,
    MaterialReportStatus,
    MessageReportStatus,
    ReviewReplyStatus,
    ReviewStatus,
    TeacherStudentRequestStatus,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';

@Injectable()
export class AdminDashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async stats(): Promise<Record<string, unknown>> {
        const [
            usersTotal,
            studentsTotal,
            teachersTotal,
            adminsTotal,
            blockedUsersTotal,
            teachersNewTotal,
            requestsPendingTotal,
            lessonsPlannedTotal,
            homeworkAssignedTotal,
            reviewsPendingTotal,
            materialsPendingTotal,
            materialReportsPendingTotal,
            messagesTotal,
            messageReportsPendingTotal,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({
                where: { role: UserRole.STUDENT },
            }),
            this.prisma.user.count({
                where: { role: UserRole.TEACHER },
            }),
            this.prisma.user.count({
                where: {
                    role: {
                        in: [UserRole.ADMIN, UserRole.MODERATOR],
                    },
                },
            }),
            this.prisma.user.count({
                where: {
                    status: { not: UserStatus.ACTIVE },
                },
            }),
            this.prisma.teacherProfile.count({
                where: {
                    verificationStatus: TeacherVerificationStatus.PENDING,
                },
            }),
            this.prisma.teacherStudentRequest.count({
                where: {
                    status: TeacherStudentRequestStatus.PENDING,
                },
            }),
            this.prisma.lesson.count({
                where: {
                    status: {
                        in: [
                            LessonStatus.SCHEDULED,
                            LessonStatus.RESCHEDULED,
                        ],
                    },
                },
            }),
            this.prisma.homework.count({
                where: { status: HomeworkStatus.ACTIVE },
            }),
            this.prisma.review.count({
                where: {
                    OR: [
                        { status: ReviewStatus.PENDING },
                        { replyStatus: ReviewReplyStatus.PENDING },
                    ],
                },
            }),
            this.prisma.learningMaterial.count({
                where: {
                    publicationStatus: MaterialPublicationStatus.PENDING,
                },
            }),
            this.prisma.materialReport.count({
                where: { status: MaterialReportStatus.PENDING },
            }),
            this.prisma.message.count(),
            this.prisma.messageReport.count({
                where: { status: MessageReportStatus.PENDING },
            }),
        ]);

        return {
            success: true,
            data: {
                users_total: usersTotal,
                students_total: studentsTotal,
                teachers_total: teachersTotal,
                admins_total: adminsTotal,
                blocked_users_total: blockedUsersTotal,
                teachers_new_total: teachersNewTotal,
                requests_pending_total: requestsPendingTotal,
                lessons_planned_total: lessonsPlannedTotal,
                homework_assigned_total: homeworkAssignedTotal,
                messages_total: messagesTotal,
                reports_new_total: messageReportsPendingTotal
                    + materialReportsPendingTotal,
                message_reports_pending_total: messageReportsPendingTotal,
                reviews_pending_total: reviewsPendingTotal,
                materials_pending_total: materialsPendingTotal,
                material_reports_pending_total: materialReportsPendingTotal,
                payments_paid_total: 0,
                payouts_pending_total: 0,
            },
        };
    }
}
