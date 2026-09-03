import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { ClearNotificationsDto } from './dto/clear-notifications.dto';
import { DeleteNotificationDto } from './dto/delete-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
    constructor(private readonly notifications: NotificationsService) {}

    @Get()
    async list(
        @CurrentUser() user: SessionUser,
        @Query() query: ListNotificationsQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.notifications.list(user, query);
    }

    @Post('read')
    @HttpCode(HttpStatus.OK)
    async read(
        @CurrentUser() user: SessionUser,
        @Body() input: MarkNotificationsReadDto,
    ): Promise<Record<string, unknown>> {
        return this.notifications.markRead(user, input);
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    async delete(
        @CurrentUser() user: SessionUser,
        @Body() input: DeleteNotificationDto,
    ): Promise<Record<string, unknown>> {
        return this.notifications.delete(user, input);
    }

    @Post('clear')
    @HttpCode(HttpStatus.OK)
    async clear(
        @CurrentUser() user: SessionUser,
        @Body() input: ClearNotificationsDto,
    ): Promise<Record<string, unknown>> {
        return this.notifications.clear(user, input);
    }
}
