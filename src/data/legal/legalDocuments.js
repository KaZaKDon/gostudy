import legalManifest from '../../../shared/legal/manifest.json';

function loadMarkdown(importDocument) {
    return importDocument().then((module) => module.default);
}

const contentLoaders = {
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
    'teacher-subscription-offer': () => (
        import('../../../shared/legal/teacher-subscription-offer.md?raw')
    ),
    'ip-npd-commission-offer': () => (
        import('../../../shared/legal/ip-npd-commission-offer.md?raw')
    ),
};

export const LEGAL_DOCUMENTS = Object.fromEntries(
    legalManifest.documents.map((document) => [
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
