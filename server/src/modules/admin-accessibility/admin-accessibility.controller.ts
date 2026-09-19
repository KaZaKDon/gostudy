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
import { AdminAccessibilityService } from './admin-accessibility.service';
import { ListAccessibilityOffersQueryDto } from './dto/list-accessibility-offers-query.dto';
import { ModerateAccessibilityOfferDto } from './dto/moderate-accessibility-offer.dto';

@Controller('admin/accessibility-offers')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminAccessibilityController {
    constructor(private readonly offers: AdminAccessibilityService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAccessibilityOffersQueryDto,
    ) {
        return this.offers.list(request.authenticatedUser, query);
    }

    @Patch(':id/moderation')
    moderate(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) offerId: number,
        @Body() input: ModerateAccessibilityOfferDto,
    ) {
        return this.offers.moderate(
            request.authenticatedUser,
            offerId,
            input,
            getRequestMetadata(request),
        );
    }
}
