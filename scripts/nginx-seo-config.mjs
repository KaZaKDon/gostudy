// Small structural reader: braces in strings and comments are not blocks.
// It is intentionally conservative: unfamiliar route customizations stop
// installation instead of being silently overwritten.
export function parseNginx(text) {
    const root = { children: [] };
    const stack = [root];
    let start = null;
    let header = '';

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === '#') {
            while (i < text.length && text[i] !== '\n') i += 1;
            header += ' ';
            continue;
        }
        if (char === '"' || char === "'") {
            if (start === null) start = i;
            const quote = char;
            header += char;
            for (i += 1; i < text.length; i += 1) {
                header += text[i];
                if (text[i] === '\\' && i + 1 < text.length) {
                    i += 1;
                    header += text[i];
                } else if (text[i] === quote) break;
            }
            if (i >= text.length) throw new Error('Unclosed nginx string');
            continue;
        }
        if (char === '\\' && i + 1 < text.length) {
            if (start === null) start = i;
            header += text.slice(i, i + 2);
            i += 1;
            continue;
        }
        if (char === '{' || char === ';') {
            const item = {
                header: header.trim().replace(/\s+/g, ' '),
                start, open: char === '{' ? i : null,
                end: char === ';' ? i + 1 : null, children: [],
            };
            stack.at(-1).children.push(item);
            if (char === '{') stack.push(item);
            start = null;
            header = '';
            continue;
        }
        if (char === '}') {
            if (stack.length === 1 || header.trim()) throw new Error('Invalid nginx block');
            stack.pop().end = i + 1;
            start = null;
            header = '';
            continue;
        }
        if (start === null && !/\s/.test(char)) start = i;
        header += char;
    }
    if (stack.length !== 1 || header.trim()) throw new Error('Incomplete nginx configuration');
    return root.children;
}

const OLD_ROUTES = new Set([
    'location = /404.html', 'location = /', 'location = /index.html',
    'location ~ ^/(about|students|teachers|pricing|payment-and-refunds|requisites|support)/?$',
    'location ~ ^/(login|register|password-reset|profile-start|account|verify-email|agreement|privacy|rules|offer|payment|refund|404)/?$',
    'location ~ ^/classroom/[^/]+/?$',
    'location ~ ^/admin(?:/.*)?$',
    'location ~ ^/legal/(agreement|marketing-consent|offer|parent-child-data-consent|personal-data-consent|privacy|rules|tariffs)/?$',
    'location /',
]);

export function updateNginxSeo(source, includePath) {
    if (!/^\/[A-Za-z0-9_./-]+$/.test(includePath)) {
        throw new Error('Nginx include path must be an absolute path without spaces');
    }
    const servers = parseNginx(source).filter(item => item.header === 'server');
    const targets = servers.filter(server => server.children.some(
        item => item.header === 'root /var/www/gostudy',
    ) && server.children.some(item => (
        item.header.startsWith('server_name ')
        && item.header.split(' ').includes('gostudyonline.ru')
    )));
    if (targets.length !== 1) throw new Error('Expected one GoStudy server with root /var/www/gostudy');
    const target = targets[0];
    const include = `include ${includePath}`;
    const existing = target.children.find(item => item.header === include);
    const oldRoutes = target.children.filter(item => OLD_ROUTES.has(item.header));

    if (existing) {
        if (oldRoutes.length) throw new Error('SEO include and old routes coexist; inspect nginx configuration');
        return { content: source, changed: false };
    }
    if (!oldRoutes.some(item => item.header === 'location /')
        || !oldRoutes.some(item => item.header === 'location = /')) {
        throw new Error('Unexpected GoStudy routing; no configuration was changed');
    }
    for (const route of oldRoutes) {
        if (route.children.some(item => (
            item.open !== null
            || !/^(?:try_files\s|internal$|add_header Cache-Control\s)/.test(item.header)
        ))) throw new Error(`Custom nginx directives in ${route.header}; no configuration was changed`);
    }
    const errorPages = target.children.filter(item => item.header.startsWith('error_page 404 '));
    if (errorPages.some(item => item.header !== 'error_page 404 /404.html')) {
        throw new Error('Custom 404 configuration; no configuration was changed');
    }
    const edits = [...oldRoutes, ...errorPages].map(item => ({
        start: item.start, end: item.end, value: '',
    }));
    edits.push({ start: target.open + 1, end: target.open + 1, value: `\n    ${include};\n` });
    let content = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        content = content.slice(0, edit.start) + edit.value + content.slice(edit.end);
    }
    parseNginx(content);
    return { content, changed: true };
}
