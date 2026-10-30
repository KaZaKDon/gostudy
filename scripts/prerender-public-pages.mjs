import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, createServer } from 'vite';

import {
    getSeoConfig,
    INDEXABLE_PUBLIC_ROUTES,
    PRERENDER_PUBLIC_ROUTES,
    PUBLIC_ROUTES,
    SITE_URL,
} from '../src/components/Seo/seoConfig.js';

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);
const distRoot = path.join(projectRoot, 'dist');
const indexPath = path.join(distRoot, 'index.html');
const manifestPath = path.join(distRoot, '.vite', 'manifest.json');

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setMeta(html, attribute, key, content) {
    const selector = new RegExp(
        `<meta\\s+[^>]*${attribute}=["']${escapeRegExp(key)}["'][^>]*>`,
        'i',
    );
    if (content == null) {
        return html.replace(selector, '');
    }
    const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;

    return selector.test(html)
        ? html.replace(selector, tag)
        : html.replace('</head>', `    ${tag}\n  </head>`);
}

function setCanonical(html, canonical) {
    const selector = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;

    if (!canonical) {
        return html.replace(selector, '');
    }
    const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;

    return selector.test(html)
        ? html.replace(selector, tag)
        : html.replace('</head>', `    ${tag}\n  </head>`);
}

function setStructuredData(html, structuredData) {
    if (!structuredData) {
        return html.replace(/<script\s+id=["']gostudy-structured-data["'][^>]*>[\s\S]*?<\/script>/i, '');
    }
    const json = JSON.stringify(structuredData).replaceAll('<', '\\u003c');
    const script = [
        '<script id="gostudy-structured-data" type="application/ld+json">',
        json,
        '</script>',
    ].join('');
    const selector = /<script\s+id=["']gostudy-structured-data["'][^>]*>[\s\S]*?<\/script>/i;

    return selector.test(html)
        ? html.replace(selector, script)
        : html.replace('</head>', `    ${script}\n  </head>`);
}

function setRootMarkup(html, markup) {
    return html.replace(
        '<div id="root"></div>',
        `<div id="root"><!--gostudy:root:start-->${markup}<!--gostudy:root:end--></div>`,
    );
}

async function buildPublicRenderer() {
    // createServer above selects development mode for its SSR loader. The
    // deployable renderer must consistently use production React and JSX.
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        await build({
            root: projectRoot,
            publicDir: false,
            configFile: path.join(projectRoot, 'vite.config.js'),
            logLevel: 'warn',
            define: { 'process.env.NODE_ENV': JSON.stringify('production') },
            ssr: { noExternal: true, external: ['vfile'] },
            build: {
                ssr: path.join(projectRoot, 'src/entry-pricing-server.jsx'),
                outDir: path.join(projectRoot, 'server/public-pages-renderer'),
                emptyOutDir: true,
                manifest: false,
                copyPublicDir: false,
                rolldownOptions: {
                    output: {
                        format: 'cjs',
                        entryFileNames: 'renderer.cjs',
                        chunkFileNames: '[name]-[hash].cjs',
                    },
                },
            },
        });
    } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
    }
}

function collectCss(manifest, entryKey, collected = new Set()) {
    const entry = manifest[entryKey];

    if (!entry) {
        return collected;
    }

    for (const cssFile of entry.css ?? []) {
        collected.add(cssFile);
    }

    for (const importedKey of entry.imports ?? []) {
        collectCss(manifest, importedKey, collected);
    }

    return collected;
}

function addRouteStyles(html, manifest, sourceEntry) {
    const cssFiles = collectCss(manifest, sourceEntry);
    let result = html;

    for (const cssFile of cssFiles) {
        const href = `/${cssFile}`;

        if (!result.includes(`href="${href}"`)) {
            result = result.replace(
                '</head>',
                `    <link rel="stylesheet" href="${href}" />\n  </head>`,
            );
        }
    }

    return result;
}

function applySeo(html, seo) {
    let result = html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(seo.title)}</title>`,
    );

    result = setMeta(result, 'name', 'description', seo.description);
    result = setMeta(result, 'name', 'robots', seo.robots);
    result = setMeta(result, 'property', 'og:type', 'website');
    result = setMeta(result, 'property', 'og:title', seo.title);
    result = setMeta(result, 'property', 'og:description', seo.description);
    result = setMeta(result, 'property', 'og:url', seo.canonical);
    result = setMeta(result, 'property', 'og:image', seo.image);
    result = setMeta(result, 'property', 'og:image:width', seo.imageWidth);
    result = setMeta(result, 'property', 'og:image:height', seo.imageHeight);
    result = setMeta(result, 'property', 'og:image:alt', seo.imageAlt);
    result = setMeta(result, 'name', 'twitter:card', 'summary_large_image');
    result = setMeta(result, 'name', 'twitter:title', seo.title);
    result = setMeta(result, 'name', 'twitter:description', seo.description);
    result = setMeta(result, 'name', 'twitter:image', seo.image);
    result = setMeta(result, 'name', 'twitter:image:alt', seo.imageAlt);
    result = setCanonical(result, seo.canonical);

    return setStructuredData(result, seo.structuredData);
}

function createSitemap() {
    const urls = INDEXABLE_PUBLIC_ROUTES.map((pathname) => {
        const url = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;

        return [
            '  <url>',
            `    <loc>${escapeHtml(url)}</loc>`,
            '  </url>',
        ].join('\n');
    }).join('\n');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
        '',
    ].join('\n');
}

async function main() {
    const [baseHtml, manifestJson] = await Promise.all([
        readFile(indexPath, 'utf8'),
        readFile(manifestPath, 'utf8'),
    ]);
    const manifest = JSON.parse(manifestJson);
    const vite = await createServer({
        root: projectRoot,
        appType: 'custom',
        logLevel: 'error',
        server: { middlewareMode: true },
    });

    try {
        const { renderPublicPage } = await vite.ssrLoadModule('/src/entry-server.jsx');

        for (const pathname of PRERENDER_PUBLIC_ROUTES) {
            const route = PUBLIC_ROUTES[pathname];
            const seo = getSeoConfig(pathname);
            const markup = await renderPublicPage(pathname, route.renderKey);
            let pageHtml = applySeo(baseHtml, seo);

            pageHtml = addRouteStyles(pageHtml, manifest, route.sourceEntry);
            pageHtml = setRootMarkup(pageHtml, markup);

            const outputPath = pathname === '/'
                ? indexPath
                : path.join(distRoot, `${pathname.slice(1)}.html`);

            await mkdir(path.dirname(outputPath), { recursive: true });
            await writeFile(outputPath, pageHtml);
        }

        const privateSeo = getSeoConfig('/account');
        await writeFile(
            path.join(distRoot, 'spa.html'),
            setRootMarkup(applySeo(baseHtml, privateSeo), ''),
        );

        const notFoundSeo = getSeoConfig('/404');
        let notFoundHtml = applySeo(baseHtml, notFoundSeo);
        notFoundHtml = addRouteStyles(notFoundHtml, manifest, 'src/pages/NotFound/NotFoundPage.jsx');
        await writeFile(
            path.join(distRoot, '404.html'),
            setRootMarkup(notFoundHtml, await renderPublicPage('/404', 'notFound')),
        );

        await writeFile(path.join(distRoot, 'sitemap.xml'), createSitemap());
    } finally {
        await vite.close();
        await rm(path.join(projectRoot, '.vite'), { recursive: true, force: true });
    }

    await buildPublicRenderer();
}

await main();
