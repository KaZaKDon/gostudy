const ROOT_START = '<!--gostudy:root:start-->';
const ROOT_END = '<!--gostudy:root:end-->';

export function serializePublicState(value: unknown): string {
    return JSON.stringify(value)
        .replaceAll('<', '\\u003c')
        .replaceAll('>', '\\u003e')
        .replaceAll('&', '\\u0026')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
}

export function renderPageTemplate(
    template: string,
    markup: string,
    publication: unknown,
): string {
    const start = template.indexOf(ROOT_START);
    const end = template.indexOf(ROOT_END);

    if (start < 0 || end < start || !template.includes('</body>')) {
        throw new Error('Public page template is incompatible; rebuild the frontend.');
    }

    const html = template.slice(0, start + ROOT_START.length)
        + markup + template.slice(end);
    const state = `<script id="gostudy-tariff-publication" type="application/json">${serializePublicState(publication)}</script>`;

    return html.replace('</body>', `${state}\n</body>`);
}
