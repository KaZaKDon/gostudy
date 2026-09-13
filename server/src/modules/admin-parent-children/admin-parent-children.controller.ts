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
import { AdminParentChildrenService } from './admin-parent-children.service';
import { ListParentChildrenQueryDto } from './dto/list-parent-children-query.dto';
import { ReviewParentChildDto } from './dto/review-parent-child.dto';

@Controller('admin/parent-children')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminParentChildrenController {
    constructor(private readonly parentChildren: AdminParentChildrenService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListParentChildrenQueryDto,
    ) {
        return this.parentChildren.list(request.authenticatedUser, query);
    }

    @Patch(':id/review')
    review(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) childProfileId: number,
        @Body() input: ReviewParentChildDto,
    ) {
        return this.parentChildren.review(
            request.authenticatedUser,
            childProfileId,
            input,
            getRequestMetadata(request),
        );
    }
}
