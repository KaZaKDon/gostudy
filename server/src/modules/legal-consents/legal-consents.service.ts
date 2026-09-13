import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
    LegalAcceptanceSource,
    LegalAcceptanceType,
} from '../../generated/prisma/enums';
import type {
    LegalAcceptanceSnapshot,
    LegalDecisionInput,
    LegalDocumentSnapshot,
} from './legal-consents.types';

type LegalManifestDocument = {
    key: string;
    slug: string;
    path: string;
    version: string;
    file: string;
};

type LegalManifest = {
    schemaVersion: number;
    documents: LegalManifestDocument[];
};

type RegistrationConsentTexts = {
    platformDocuments: string;
    personalData: string;
    marketing: string;
    parentChildData: string;
};

@Injectable()
export class LegalConsentsService {
    private readonly documentsByKey: Map<string, LegalManifestDocument>;
    private readonly consentTexts: RegistrationConsentTexts;
    private readonly legalDocumentsDirectory: string;

    constructor(config: ConfigService) {
        this.legalDocumentsDirectory = resolve(
            process.cwd(),
            config.get<string>('LEGAL_DOCUMENTS_DIR', '../shared/legal'),
        );

        const manifest = this.readJson<LegalManifest>('manifest.json');
        this.consentTexts = this.readJson<RegistrationConsentTexts>(
            'registration-consents.json',
        );
        this.documentsByKey = new Map(
            manifest.documents.map((document) => [document.key, document]),
        );
    }

    getRegistrationSnapshots(
        decisions: LegalDecisionInput,
    ): LegalAcceptanceSnapshot[] {
        return [
            {
                type: LegalAcceptanceType.PLATFORM_DOCUMENTS,
                source: LegalAcceptanceSource.REGISTRATION,
                accepted: decisions.platformDocumentsAccepted,
                consentText: this.consentTexts.platformDocuments,
                documents: [
                    this.getDocumentSnapshot('user_agreement'),
                    this.getDocumentSnapshot('platform_rules'),
                    this.getDocumentSnapshot('privacy_policy'),
                ],
            },
            {
                type: LegalAcceptanceType.PERSONAL_DATA,
                source: LegalAcceptanceSource.REGISTRATION,
                accepted: decisions.personalDataAccepted,
                consentText: this.consentTexts.personalData,
                documents: [
                    this.getDocumentSnapshot('personal_data_consent'),
                ],
            },
            {
                type: LegalAcceptanceType.MARKETING,
                source: LegalAcceptanceSource.REGISTRATION,
                accepted: decisions.marketingAccepted,
                consentText: this.consentTexts.marketing,
                documents: [
                    this.getDocumentSnapshot('marketing_consent'),
                ],
            },
        ];
    }

    getParentChildDataSnapshot(
        accepted: boolean,
    ): LegalAcceptanceSnapshot {
        return {
            type: LegalAcceptanceType.PARENT_CHILD_DATA,
            source: LegalAcceptanceSource.PROFILE,
            accepted,
            consentText: this.consentTexts.parentChildData,
            documents: [
                this.getDocumentSnapshot('parent_child_data_consent'),
                this.getDocumentSnapshot('privacy_policy'),
            ],
        };
    }

    private getDocumentSnapshot(key: string): LegalDocumentSnapshot {
        const document = this.documentsByKey.get(key);

        if (!document) {
            throw new Error(`Юридический документ ${key} отсутствует в manifest.json`);
        }

        const content = readFileSync(
            resolve(this.legalDocumentsDirectory, document.file),
        );

        return {
            documentKey: document.key,
            documentVersion: document.version,
            documentPath: document.path,
            contentHash: createHash('sha256').update(content).digest('hex'),
        };
    }

    private readJson<T>(fileName: string): T {
        const content = readFileSync(
            resolve(this.legalDocumentsDirectory, fileName),
            'utf8',
        );

        return JSON.parse(content) as T;
    }
}
