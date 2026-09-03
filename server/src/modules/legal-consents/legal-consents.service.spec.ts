import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { LegalAcceptanceType } from '../../generated/prisma/enums';
import { LegalConsentsService } from './legal-consents.service';

describe('LegalConsentsService', () => {
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
});
