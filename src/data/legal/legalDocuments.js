import legalManifest from '../../../shared/legal/manifest.json';

function loadMarkdown(importDocument) {
    return importDocument().then((module) => module.default);
}

const contentLoaders = {
    offer: () => import('../../../shared/legal/platform-subscription-offer.md?raw'),
    agreement: () => import('../../../shared/legal/user-agreement.md?raw'),
    privacy: () => import('../../../shared/legal/privacy-policy.md?raw'),
    rules: () => import('../../../shared/legal/platform-rules.md?raw'),
    'personal-data-consent': () => (
        import('../../../shared/legal/personal-data-consent.md?raw')
    ),
    'parent-child-data-consent': () => (
        import('../../../shared/legal/parent-child-data-consent.md?raw')
    ),
    'marketing-consent': () => (
        import('../../../shared/legal/marketing-consent.md?raw')
    ),
    tariffs: () => import('../../../shared/legal/tariffs.md?raw'),
};

export const LEGAL_DOCUMENTS = Object.fromEntries(
    legalManifest.documents
        .filter((document) => document.enabled !== false)
        .map((document) => [
            document.slug,
            {
                ...document,
                loadContent: () => loadMarkdown(contentLoaders[document.slug]),
            },
        ]),
);

export const LEGAL_DOCUMENT_LINKS = [
    LEGAL_DOCUMENTS.agreement,
    LEGAL_DOCUMENTS.privacy,
    LEGAL_DOCUMENTS.rules,
];

export function getLegalDocument(documentType) {
    return LEGAL_DOCUMENTS[documentType] || null;
}
