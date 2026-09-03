import type {
    LegalAcceptanceSource,
    LegalAcceptanceType,
} from '../../generated/prisma/enums';

export type LegalDecisionInput = {
    platformDocumentsAccepted: boolean;
    personalDataAccepted: boolean;
    marketingAccepted: boolean;
};

export type LegalDocumentSnapshot = {
    documentKey: string;
    documentVersion: string;
    documentPath: string;
    contentHash: string;
};

export type LegalAcceptanceSnapshot = {
    type: LegalAcceptanceType;
    source: LegalAcceptanceSource;
    accepted: boolean;
    consentText: string;
    documents: LegalDocumentSnapshot[];
};
