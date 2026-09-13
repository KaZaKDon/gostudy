import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { CreateParentChildDto } from './dto/create-parent-child.dto';
import { ParentChildrenService } from './parent-children.service';

@Controller('parent/children')
@UseGuards(SessionAuthGuard)
export class ParentChildrenController {
    constructor(private readonly children: ParentChildrenService) {}

    @Get()
    list(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.children.list(user);
    }

    @Post()
    create(
        @CurrentUser() user: SessionUser,
        @Body() input: CreateParentChildDto,
        @Req() request: Request,
    ): Promise<Record<string, unknown>> {
        return this.children.create(
            user,
            input,
            getRequestMetadata(request),
        );
    }
}
