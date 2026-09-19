import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnvironment } from './config/validate-environment';
import { AdminAccountsModule } from './modules/admin-accounts/admin-accounts.module';
import { AdminAccessibilityModule } from './modules/admin-accessibility/admin-accessibility.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AdminDictionariesModule } from './modules/admin-dictionaries/admin-dictionaries.module';
import { AdminDocumentsModule } from './modules/admin-documents/admin-documents.module';
import { AdminMaterialsModule } from './modules/admin-materials/admin-materials.module';
import { AdminMessagesModule } from './modules/admin-messages/admin-messages.module';
import { AdminParentChildrenModule } from './modules/admin-parent-children/admin-parent-children.module';
import { AdminProfileMediaModule } from './modules/admin-profile-media/admin-profile-media.module';
import { AdminReviewsModule } from './modules/admin-reviews/admin-reviews.module';
import { AdminStudentsModule } from './modules/admin-students/admin-students.module';
import { AdminTeachersModule } from './modules/admin-teachers/admin-teachers.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccessibilityProgramModule } from './modules/accessibility-program/accessibility-program.module';
import { AccessibilityApplicationsModule } from './modules/accessibility-applications/accessibility-applications.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { HealthModule } from './modules/health/health.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { JournalModule } from './modules/journal/journal.module';
import { LegalConsentsModule } from './modules/legal-consents/legal-consents.module';
import { MailModule } from './modules/mail/mail.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ParentChildrenModule } from './modules/parent-children/parent-children.module';
import { ParentDashboardModule } from './modules/parent-dashboard/parent-dashboard.module';
import { ParentStudentLinksModule } from './modules/parent-student-links/parent-student-links.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { TeacherDashboardModule } from './modules/teacher-dashboard/teacher-dashboard.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
            validate: validateEnvironment,
        }),
        PrismaModule,
        LegalConsentsModule,
        MailModule,
        AuthModule,
        AccessibilityProgramModule,
        AccessibilityApplicationsModule,
        ClassroomModule,
        HomeworkModule,
        JournalModule,
        MaterialsModule,
        MessagesModule,
        AdminAccountsModule,
        AdminAccessibilityModule,
        AdminDashboardModule,
        AdminDictionariesModule,
        AdminDocumentsModule,
        AdminMaterialsModule,
        AdminMessagesModule,
        AdminParentChildrenModule,
        AdminProfileMediaModule,
        AdminReviewsModule,
        AdminStudentsModule,
        AdminTeachersModule,
        NotificationsModule,
        ParentChildrenModule,
        ParentDashboardModule,
        ParentStudentLinksModule,
        ProfileModule,
        ReviewsModule,
        ScheduleModule,
        TariffsModule,
        TeachersModule,
        TeacherDashboardModule,
        HealthModule,
    ],
})
export class AppModule {}
