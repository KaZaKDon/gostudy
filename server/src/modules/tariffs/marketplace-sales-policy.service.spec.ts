import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { MarketplaceSalesPolicyService } from './marketplace-sales-policy.service';

describe('MarketplaceSalesPolicyService', () => {
    it('keeps paid material sales disabled by default', () => {
        const policy = new MarketplaceSalesPolicyService(
            new ConfigService({}),
        );

        expect(policy.isMaterialSalesEnabled()).toBe(false);
        expect(policy.publicState()).toMatchObject({ enabled: false });
    });

    it('can restore the preserved model with an explicit switch', () => {
        const policy = new MarketplaceSalesPolicyService(new ConfigService({
            MATERIAL_MARKETPLACE_SALES_ENABLED: true,
        }));

        expect(policy.isMaterialSalesEnabled()).toBe(true);
        expect(policy.publicState()).toMatchObject({ enabled: true });
    });
});
