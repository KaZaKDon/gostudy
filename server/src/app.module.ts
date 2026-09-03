import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnvironment } from './config/validate-environment';
import { AdminAccountsModule } from './modules/admin-accounts/admin-accounts.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AdminDictionariesModule } from './modules/admin-dictionaries/admin-dictionaries.module';
import { AdminMaterialsModule } from './modules/admin-materials/admin-materials.module';
import { AdminMessagesModule } from './modules/admin-messages/admin-messages.module';
import { AdminReviewsModule } from './modules/admin-reviews/admin-reviews.module';
import { AdminStudentsModule } from './modules/admin-students/admin-students.module';
import { AdminTeachersModule } from './modules/admin-teachers/admin-teachers.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { HealthModule } from './modules/health/health.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { JournalModule } from './modules/journal/journal.module';
import { LegalConsentsModule } from './modules/legal-consents/legal-consents.module';
import { MailModule } from './modules/mail/mail.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { TeachersModule } from './modules/teachers/teachers.module';

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
        ClassroomModule,
        HomeworkModule,
        JournalModule,
        MaterialsModule,
        MessagesModule,
        AdminAccountsModule,
        AdminDashboardModule,
        AdminDictionariesModule,
        AdminMaterialsModule,
        AdminMessagesModule,
        AdminReviewsModule,
        AdminStudentsModule,
        AdminTeachersModule,
        NotificationsModule,
        ProfileModule,
        ReviewsModule,
        ScheduleModule,
        TeachersModule,
        HealthModule,
    ],
})
export class AppModule {}
