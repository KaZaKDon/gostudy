import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { AdminReviewsService } from './admin-reviews.service';
import { ListAdminReviewsQueryDto } from './dto/list-admin-reviews-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Controller('admin/reviews')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminReviewsController {
    constructor(private readonly reviews: AdminReviewsService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminReviewsQueryDto,
    ) {
        return this.reviews.list(request.authenticatedUser, query);
    }

    @Patch(':id/moderation')
    moderate(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) reviewId: number,
        @Body() input: ModerateReviewDto,
    ) {
        return this.reviews.moderate(
            request.authenticatedUser,
            reviewId,
            input,
            getRequestMetadata(request),
        );
    }
}
