import { Logger } from '@nestjs/common';
import type { Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TariffsService } from '../tariffs/tariffs.service';
import { renderPageTemplate, serializePublicState } from './public-page-template';
import { PublicPageRendererService } from './public-page-renderer.service';
import { PublicPagesController } from './public-pages.controller';
import { PublicPagesService } from './public-pages.service';

const template = '<html><head></head><body><div id="root"><!--gostudy:root:start-->old<!--gostudy:root:end--></div></body></html>';

afterEach(() => vi.restoreAllMocks());

describe('public page templates', () => {
    it('replaces only the root markup and includes a safe bootstrap snapshot', () => {
        const publication = { title: '</script><script>alert(1)</script>&\u2028\u2029' };
        const html = renderPageTemplate(template, '<main>Actual price</main>', publication);
        expect(html).toContain('<main>Actual price</main>');
        expect(html).not.toContain('-->old<!--');
        expect(html).not.toContain('</script><script>alert');
        expect(html).toContain('id="gostudy-tariff-publication"');
        expect(JSON.parse(serializePublicState(publication))).toEqual(publication);
    });

    it('rejects stale or missing frontend templates', () => {
        expect(() => renderPageTemplate('<html>old</html>', 'new', {})).toThrow(/rebuild/);
    });
});

describe('PublicPagesService', () => {
    it('always uses the latest public publication without modifying tariffs', async () => {
        const first = { id: 1, content: { price: 990 } };
        const second = { id: 2, content: { price: 1490 } };
        const publicTariffs = vi.fn()
            .mockResolvedValueOnce({ success: true, data: first })
            .mockResolvedValueOnce({ success: true, data: second });
        const pricing = vi.fn().mockImplementation(async (value) => JSON.stringify(value));
        const service = new PublicPagesService(
            { publicTariffs } as unknown as TariffsService,
            { pricing } as unknown as PublicPageRendererService,
        );
        expect((await service.pricing()).html).toContain('990');
        expect((await service.pricing()).html).toContain('1490');
        expect(publicTariffs).toHaveBeenCalledTimes(2);
        expect(pricing).toHaveBeenNthCalledWith(2, second);
    });

    it('returns 503 without a fabricated price or private error details when DB is unavailable', async () => {
        vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        const service = new PublicPagesService(
            { publicTariffs: vi.fn().mockRejectedValue(new Error('private database error')) } as unknown as TariffsService,
            {} as PublicPageRendererService,
        );
        const page = await service.pricing();
        expect(page.status).toBe(503);
        expect(page.html).toContain('noindex');
        expect(page.html).not.toContain('private database error');
        expect(page.html).not.toContain('990');
    });

    it('returns 503 if renderer artifacts are missing', async () => {
        vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        const service = new PublicPagesService(
            { publicTariffs: vi.fn().mockResolvedValue({ success: true, data: {} }) } as unknown as TariffsService,
            { pricing: vi.fn().mockRejectedValue(new Error('missing template')) } as unknown as PublicPageRendererService,
        );
        expect((await service.pricing()).status).toBe(503);
    });
});

describe('PublicPagesController', () => {
    function response() {
        return {
            setHeader: vi.fn(), status: vi.fn().mockReturnThis(),
            type: vi.fn().mockReturnThis(), send: vi.fn(),
        };
    }

    it('does not cache public tariff HTML', async () => {
        const controller = new PublicPagesController({
            pricing: vi.fn().mockResolvedValue({ status: 200, html: '<main>price</main>' }),
        } as unknown as PublicPagesService);
        const res = response();
        await controller.pricing(res as unknown as Response);
        expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.type).toHaveBeenCalledWith('html');
    });

    it('marks temporary failures as noindex and allows retry', async () => {
        const controller = new PublicPagesController({
            pricing: vi.fn().mockResolvedValue({ status: 503, html: '<main>Unavailable</main>' }),
        } as unknown as PublicPagesService);
        const res = response();
        await controller.pricing(res as unknown as Response);
        expect(res.setHeader).toHaveBeenCalledWith('X-Robots-Tag', 'noindex, follow');
        expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
        expect(res.status).toHaveBeenCalledWith(503);
    });
});
