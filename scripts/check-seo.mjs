import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
    getSeoConfig,
    INDEXABLE_PUBLIC_ROUTES,
    PRERENDER_PUBLIC_ROUTES,
    PUBLIC_ROUTES,
    SITE_URL,
} from '../src/components/Seo/seoConfig.js';
import { PLATFORM_IDENTITY } from '../src/config/platformIdentity.js';

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);
const errors = [];

function check(condition, message) {
    if (!condition) {
        errors.push(message);
    }
}

function routeOutputPath(root, pathname) {
    return pathname === '/'
        ? path.join(root, 'index.html')
        : path.join(root, `${pathname.slice(1)}.html`);
}

async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

function sitemapUrls(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => match[1]);
}

function readPngSize(buffer) {
    if (buffer.toString('ascii', 1, 4) !== 'PNG') {
        return null;
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

async function checkBuiltPages() {
    const distRoot = path.join(projectRoot, 'dist');

    if (!(await fileExists(path.join(distRoot, 'index.html')))) {
        return;
    }

    for (const pathname of PRERENDER_PUBLIC_ROUTES) {
        const outputPath = routeOutputPath(distRoot, pathname);
        check(
            await fileExists(outputPath),
            `Для ${pathname} не создан предварительный HTML`,
        );

        if (!(await fileExists(outputPath))) {
            continue;
        }

        const html = await readFile(outputPath, 'utf8');
        const seo = getSeoConfig(pathname);

        check(
            html.includes(`<title>${seo.title}</title>`),
            `В HTML ${pathname} неверный title`,
        );
        check(
            html.includes(`rel="canonical" href="${seo.canonical}"`),
            `В HTML ${pathname} неверный canonical`,
        );
        check(
            html.includes(`name="robots" content="${seo.robots}"`),
            `В HTML ${pathname} неверная директива robots`,
        );

        if (pathname.startsWith('/legal/')) {
            check(/<h1(?:\s|>)/i.test(html), `В документе ${pathname} отсутствует полный HTML`);
            check(!html.includes('Загружаем документ'), `Документ ${pathname} остался загрузчиком`);
        }

        if (['/', '/support', '/requisites'].includes(pathname)) {
            check(html.includes(PLATFORM_IDENTITY.supportPhoneHref), `В ${pathname} отсутствует телефон`);
        }

        if (PUBLIC_ROUTES[pathname].indexable) {
            check(
                /<h1(?:\s|>)/i.test(html),
                `В индексируемом HTML ${pathname} отсутствует H1`,
            );
            check(
                !html.includes('<div id="root"></div>'),
                `Индексируемый HTML ${pathname} остался пустой оболочкой`,
            );
        }
    }

    const spaHtml = await readFile(path.join(distRoot, 'spa.html'), 'utf8');
    check(/name="robots" content="noindex/.test(spaHtml), 'SPA-шаблон не закрыт noindex');
    check(!/rel="canonical"/.test(spaHtml), 'SPA-шаблон не должен ссылаться canonical на главную');
    check(!spaHtml.includes('ПОШЛИ УЧИТЬСЯ'), 'SPA-шаблон содержит главную вместо служебной оболочки');
    const errorHtml = await readFile(path.join(distRoot, '404.html'), 'utf8');
    check(errorHtml.includes('Страница не найдена'), 'Не создана настоящая 404-страница');
    check(/name="robots" content="noindex/.test(errorHtml), '404-страница не закрыта noindex');
    check(await fileExists(path.join(projectRoot, 'server/public-pages-renderer/renderer.cjs')), 'Не собран серверный renderer тарифа');
}

async function main() {
    const [
        robots,
        htaccess,
        sitemap,
        teachersPage,
        homeBlocks,
        desktopScene,
        socialCard,
    ] = await Promise.all([
        readFile(path.join(projectRoot, 'public', 'robots.txt'), 'utf8'),
        readFile(path.join(projectRoot, 'public', '.htaccess'), 'utf8'),
        readFile(path.join(projectRoot, 'public', 'sitemap.xml'), 'utf8'),
        readFile(path.join(projectRoot, 'src', 'pages', 'Teachers', 'TeachersPage.jsx'), 'utf8'),
        readFile(path.join(projectRoot, 'src', 'data', 'homeBlocks.js'), 'utf8'),
        readFile(path.join(projectRoot, 'src', 'components', 'DesktopScene', 'DesktopScene.jsx'), 'utf8'),
        readFile(path.join(projectRoot, 'public', 'images', 'branding', 'gostudy-social-card.png')),
    ]);

    const actualSitemapUrls = sitemapUrls(sitemap);
    const expectedSitemapUrls = INDEXABLE_PUBLIC_ROUTES.map(
        (pathname) => `${SITE_URL}${pathname === '/' ? '/' : pathname}`,
    );

    check(
        robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`),
        'robots.txt должен ссылаться на sitemap.xml',
    );
    check(!/Disallow:\s*\/(?:login|register|account|admin|classroom|verify-email|profile-start|password-reset)/.test(robots),
        'robots.txt мешает чтению noindex служебных HTML-страниц');
    check(
        JSON.stringify(actualSitemapUrls) === JSON.stringify(expectedSitemapUrls),
        'sitemap.xml не совпадает с единым реестром индексируемых страниц',
    );

    for (const pathname of INDEXABLE_PUBLIC_ROUTES) {
        const seo = getSeoConfig(pathname);

        check(
            seo.robots === 'index, follow',
            `Индексируемая страница ${pathname} закрыта в SEO-конфигурации`,
        );
    }

    check(
        !/SetEnvIf[^\n]+(?:about|students|teachers|pricing)/i.test(htaccess),
        'Публичные маркетинговые страницы закрыты X-Robots-Tag',
    );
    check(
        !/legal\/\[a-z0-9-\]/i.test(htaccess),
        'Сервер принимает произвольные legal-slug вместо настоящего 404',
    );
    check(
        htaccess.includes('R=301'),
        'Для устаревших публичных адресов не настроены постоянные редиректы',
    );
    check(
        !/(удержания|ближайшая сумма к выплате|история переводов)/i.test(teachersPage),
        'На странице преподавателей остался текст старой модели выплат',
    );
    check(
        !/(комиссия с проведённых занятий|продавать собственные учебные материалы)/i.test(homeBlocks),
        'В данных главной остался текст старой финансовой модели',
    );
    check(
        !/decor-(?:cup|pencil|notebook)\.svg/.test(desktopScene),
        'Главная ссылается на отсутствующие декоративные SVG',
    );

    const socialCardSize = readPngSize(socialCard);
    check(
        socialCardSize?.width === 1200 && socialCardSize?.height === 630,
        'Социальная карточка должна иметь размер 1200×630',
    );

    await checkBuiltPages();

    if (errors.length > 0) {
        throw new Error(
            `SEO check failed:\n- ${errors.join('\n- ')}`,
        );
    }

    execFileSync(process.execPath, [
        '--test', path.join(projectRoot, 'scripts/seo-renderer.test.mjs'),
        path.join(projectRoot, 'scripts/nginx-seo-config.test.mjs'),
    ], { stdio: 'inherit' });

    console.log(
        `SEO check: OK (${INDEXABLE_PUBLIC_ROUTES.length} indexable pages)`,
    );
}

await main();
