import { LEGAL_DOCUMENTS } from './legalDocuments.js';
import registrationConsents from '../../../shared/legal/registration-consents.json';

export const REGISTRATION_CONSENT_TEXT = registrationConsents;

function documentReference(documentType) {
    const document = LEGAL_DOCUMENTS[documentType];

    return {
        key: document.key,
        version: document.version,
        path: document.path,
    };
}

export function buildRegistrationLegalAcceptances({
    platformDocumentsAccepted,
    personalDataAccepted,
    marketingAccepted,
}) {
    return {
        platform_documents: {
            accepted: platformDocumentsAccepted,
            text: REGISTRATION_CONSENT_TEXT.platformDocuments,
            documents: [
                documentReference('agreement'),
                documentReference('rules'),
                documentReference('privacy'),
            ],
        },
        personal_data: {
            accepted: personalDataAccepted,
            text: REGISTRATION_CONSENT_TEXT.personalData,
            documents: [documentReference('personal-data-consent')],
        },
        marketing: {
            accepted: marketingAccepted,
            text: REGISTRATION_CONSENT_TEXT.marketing,
            documents: [documentReference('marketing-consent')],
        },
    };
}
