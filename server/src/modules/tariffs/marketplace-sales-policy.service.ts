import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const MATERIAL_MARKETPLACE_SALES_DISABLED_NOTICE =
    'Платная продажа пользовательских материалов через GoStudy в первой версии отключена. Личная библиотека и бесплатная публикация после модерации доступны в составе подписки.';

@Injectable()
export class MarketplaceSalesPolicyService {
    private readonly materialSalesEnabled: boolean;

    constructor(config: ConfigService) {
        const configured = config.get(
            'MATERIAL_MARKETPLACE_SALES_ENABLED',
            false,
        );

        this.materialSalesEnabled = ['true', '1', 'yes', 'on'].includes(
            String(configured).trim().toLowerCase(),
        );
    }

    isMaterialSalesEnabled(): boolean {
        return this.materialSalesEnabled;
    }

    publicState() {
        return {
            enabled: this.materialSalesEnabled,
            notice: this.materialSalesEnabled
                ? 'Продажа пользовательских материалов через каталог включена.'
                : MATERIAL_MARKETPLACE_SALES_DISABLED_NOTICE,
        } as const;
    }
}
