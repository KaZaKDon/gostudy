import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { AccessibilityProgramService } from './accessibility-program.service';
import { SaveAccessibilityOfferDto } from './dto/save-accessibility-offer.dto';

@Controller('accessibility-program')
@UseGuards(SessionAuthGuard)
export class AccessibilityProgramController {
    constructor(private readonly program: AccessibilityProgramService) {}

    @Get('offers')
    show(@CurrentUser() user: SessionUser) {
        return this.program.show(user);
    }

    @Post('offers')
    save(
        @CurrentUser() user: SessionUser,
        @Body() input: SaveAccessibilityOfferDto,
    ) {
        return this.program.save(user, input);
    }

    @Patch('offers/:id/archive')
    archive(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) offerId: number,
    ) {
        return this.program.archive(user, offerId);
    }
}
