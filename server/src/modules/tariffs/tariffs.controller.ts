import { Controller, Get } from '@nestjs/common';

import { TariffsService } from './tariffs.service';

@Controller('tariffs')
export class TariffsController {
    constructor(private readonly tariffs: TariffsService) {}

    @Get('public')
    publicTariffs() {
        return this.tariffs.publicTariffs();
    }
}
