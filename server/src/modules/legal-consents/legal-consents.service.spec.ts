import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { LegalAcceptanceType } from '../../generated/prisma/enums';
import { LegalConsentsService } from './legal-consents.service';

describe('LegalConsentsService', () => {
    it('keeps manifest versions aligned with document headings', () => {
        const directory = resolve(process.cwd(), '../shared/legal');
        const manifest = JSON.parse(
            readFileSync(resolve(directory, 'manifest.json'), 'utf8'),
        ) as {
            documents: Array<{ file: string; key: string; version: string }>;
        };

        for (const document of manifest.documents) {
            const content = readFileSync(
                resolve(directory, document.file),
                'utf8',
            );
            const headingVersion = content.match(
                /^\*\*Редакция:\*\*\s*([^\s]+)/m,
            )?.[1];

            expect(headingVersion, document.key).toBe(document.version);
        }
    });

    it('creates immutable snapshots for all registration decisions', () => {
        const config = new ConfigService({
            LEGAL_DOCUMENTS_DIR: '../shared/legal',
        });
        const service = new LegalConsentsService(config);
        const snapshots = service.getRegistrationSnapshots({
            platformDocumentsAccepted: true,
            personalDataAccepted: true,
            marketingAccepted: false,
        });

        expect(snapshots).toHaveLength(3);
        expect(snapshots[0].type).toBe(
            LegalAcceptanceType.PLATFORM_DOCUMENTS,
        );
        expect(snapshots[0].documents).toHaveLength(3);
        expect(snapshots[1].accepted).toBe(true);
        expect(snapshots[2].accepted).toBe(false);

        for (const snapshot of snapshots) {
            for (const document of snapshot.documents) {
                expect(document.contentHash).toMatch(/^[a-f0-9]{64}$/);
            }
        }
    });

    it('creates a separate snapshot for one child', () => {
        const config = new ConfigService({
            LEGAL_DOCUMENTS_DIR: '../shared/legal',
        });
        const service = new LegalConsentsService(config);
        const snapshot = service.getParentChildDataSnapshot(true);

        expect(snapshot.type).toBe(LegalAcceptanceType.PARENT_CHILD_DATA);
        expect(snapshot.accepted).toBe(true);
        expect(snapshot.documents.map((document) => document.documentKey))
            .toEqual([
                'parent_child_data_consent',
                'privacy_policy',
            ]);
    });
});
