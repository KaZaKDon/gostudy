import { Module } from '@nestjs/common';

import { PlatformIdentityModule } from '../platform-identity/platform-identity.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { PublicPageRendererService } from './public-page-renderer.service';
import { PublicPagesController } from './public-pages.controller';
import { PublicPagesService } from './public-pages.service';

@Module({
    imports: [TariffsModule, PlatformIdentityModule],
    controllers: [PublicPagesController],
    providers: [PublicPagesService, PublicPageRendererService],
})
export class PublicPagesModule {}
