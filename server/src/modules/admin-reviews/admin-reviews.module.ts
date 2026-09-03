import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';

@Module({
    imports: [AuthModule, NotificationsModule, ReviewsModule],
    controllers: [AdminReviewsController],
    providers: [AdminReviewsService],
})
export class AdminReviewsModule {}
