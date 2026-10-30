import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PlatformIdentityService } from '../platform-identity/platform-identity.service';
import { renderPageTemplate, serializePublicState } from './public-page-template';

const PATHS = new Set(['/', '/about', '/students', '/teachers', '/pricing', '/payment-and-refunds', '/requisites', '/support',
    ...['agreement', 'privacy', 'rules', 'offer', 'tariffs', 'personal-data-consent', 'parent-child-data-consent', 'marketing-consent'].map((key) => '/legal/' + key)]);
type PublicRenderer = {
    renderSitePage(path: string, identity: unknown, publication?: unknown): Promise<string>;
    siteStructuredData(path: string, identity: unknown): unknown;
};
@Injectable()
export class PublicPageRendererService {
    constructor(private readonly config: ConfigService, private readonly identity: PlatformIdentityService) {}
    async pricing(publication: unknown): Promise<string> { return this.site('/pricing', publication); }
    async site(path: string, publication?: unknown): Promise<string> {
        if (!PATHS.has(path)) throw new NotFoundException();
        const publicDir = this.config.get<string>('PUBLIC_PAGES_DIR') || resolve(__dirname, '../../../../dist');
        const rendererPath = resolve(__dirname, '../../../public-pages-renderer/renderer.cjs');
        const renderer = require(rendererPath) as PublicRenderer;
        const { data: identity } = await this.identity.read();
        const template = await readFile(resolve(publicDir, path === '/' ? 'index.html' : path.slice(1) + '.html'), 'utf8');
        const markup = await renderer.renderSitePage(path, identity, publication);
        let html = renderPageTemplate(template, markup, publication ?? null);
        const structured = serializePublicState(renderer.siteStructuredData(path, identity));
        html = html.replace(/(<script\s+id=["']gostudy-structured-data["'][^>]*>)[\s\S]*?(<\/script>)/i,
            (_match: string, start: string, end: string) => start + structured + end);
        return html.replace('</body>', `<script id="gostudy-platform-identity" type="application/json">${serializePublicState(identity)}</script>\n</body>`);
    }
}
