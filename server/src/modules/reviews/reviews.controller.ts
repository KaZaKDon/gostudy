import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { SaveReviewReplyDto } from './dto/save-review-reply.dto';
import { SaveReviewDto } from './dto/save-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(SessionAuthGuard)
export class ReviewsController {
    constructor(private readonly reviews: ReviewsService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListReviewsQueryDto,
    ) {
        return this.reviews.list(request.authenticatedUser, query);
    }

    @Post()
    save(
        @Req() request: AuthenticatedRequest,
        @Body() input: SaveReviewDto,
    ) {
        return this.reviews.save(request.authenticatedUser, input);
    }

    @Post('reply')
    reply(
        @Req() request: AuthenticatedRequest,
        @Body() input: SaveReviewReplyDto,
    ) {
        return this.reviews.reply(request.authenticatedUser, input);
    }
}
