import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { PublicPagesService } from './public-pages.service';

@Controller('public-pages')
export class PublicPagesController {
    constructor(private readonly pages: PublicPagesService) {}

    @Get('site')
    async site(@Query('path') path: string, @Res() response: Response): Promise<void> {
        const page = await this.pages.site(path);
        response.setHeader('Cache-Control', 'no-store');
        if (page.status !== 200) {
            response.setHeader('X-Robots-Tag', 'noindex, follow');
            response.setHeader('Retry-After', '60');
        }
        response.status(page.status).type('html').send(page.html);
    }

    @Get('pricing')
    async pricing(@Res() response: Response): Promise<void> {
        const page = await this.pages.pricing();
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');

        if (page.status !== 200) {
            response.setHeader('X-Robots-Tag', 'noindex, follow');
            response.setHeader('Retry-After', '60');
        }

        response.status(page.status).type('html').send(page.html);
    }
}
