import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { TariffsService } from '../tariffs/tariffs.service';
import { PublicPageRendererService } from './public-page-renderer.service';

export type PublicPage = { status: number; html: string };

@Injectable()
export class PublicPagesService {
    private readonly logger = new Logger(PublicPagesService.name);

    constructor(
        private readonly tariffs: TariffsService,
        private readonly renderer: PublicPageRendererService,
    ) {}

    async site(path: string): Promise<PublicPage> {
        if (path === '/pricing') return this.pricing();
        try { return { status: 200, html: await this.renderer.site(path) }; }
        catch (error) {
            if (error instanceof NotFoundException) throw error;
            this.logger.error('Публичная страница временно недоступна');
            return { status: 503, html: '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>GoStudy — временно недоступно</title></head><body><h1>Страница временно недоступна</h1><p>Обновите страницу позже.</p></body></html>' };
        }
    }

    async pricing(): Promise<PublicPage> {
        try {
            // Always read the current publication through the existing policy
            // service. No seeding, database writes, or cached/hardcoded prices.
            const result = await this.tariffs.publicTariffs();
            if (!result.success || !result.data) {
                throw new Error('Published tariff is unavailable');
            }

            return { status: 200, html: await this.renderer.pricing(result.data) };
        } catch (error) {
            this.logger.error(
                'Не удалось подготовить публичную страницу тарифа',
                error instanceof Error ? error.stack : undefined,
            );

            return {
                status: 503,
                html: '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
                    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
                    + '<meta name="robots" content="noindex, follow">'
                    + '<title>Тарифы временно недоступны — GoStudy</title></head>'
                    + '<body><main><h1>Тарифы временно недоступны</h1>'
                    + '<p>Попробуйте обновить страницу немного позже.</p>'
                    + '<p><a href="/support">Поддержка GoStudy</a></p>'
                    + '<a href="/">На главную</a></main></body></html>',
            };
        }
    }
}
