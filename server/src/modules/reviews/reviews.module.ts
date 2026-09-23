import { Module } from '@nestjs/common';

import { ParentChildAccessModule } from '../../common/access/parent-child-access.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
    imports: [AuthModule, ParentChildAccessModule],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule {}
