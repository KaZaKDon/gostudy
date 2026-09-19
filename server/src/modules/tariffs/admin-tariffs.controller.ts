import {
    Body,
    Controller,
    Get,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { SaveTariffDraftDto } from './dto/save-tariff-draft.dto';
import { TariffsService } from './tariffs.service';

@Controller('admin/tariffs')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminTariffsController {
    constructor(private readonly tariffs: TariffsService) {}

    @Get()
    adminTariffs(@Req() request: AuthenticatedRequest) {
        return this.tariffs.adminTariffs(request.authenticatedUser);
    }

    @Put('draft')
    saveDraft(
        @Req() request: AuthenticatedRequest,
        @Body() input: SaveTariffDraftDto,
    ) {
        return this.tariffs.saveDraft(
            request.authenticatedUser,
            input,
            getRequestMetadata(request),
        );
    }

    @Post('publish')
    publish(@Req() request: AuthenticatedRequest) {
        return this.tariffs.publishDraft(
            request.authenticatedUser,
            getRequestMetadata(request),
        );
    }
}
