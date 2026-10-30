export function isTariffPublication(publication) {
    const content = publication?.content;
    const tariff = content?.individual;

    return Boolean(
        publication?.status === 'published'
        && content && tariff && content.business
        && content.lesson_payments && content.materials
        && Array.isArray(tariff.features)
        && Array.isArray(content.business.features)
        && Number.isFinite(tariff.price_rubles)
        && tariff.price_rubles >= 0
        && Number.isInteger(tariff.period_days)
        && tariff.period_days > 0
        && typeof content.materials.sales_enabled === 'boolean'
        && Number.isFinite(content.materials.sale_commission_percent)
        && Number.isFinite(content.materials.payout_hold_days)
    );
}

export function readInitialTariffPublication() {
    if (typeof document === 'undefined') {
        return null;
    }

    try {
        const element = document.getElementById('gostudy-tariff-publication');
        const publication = element ? JSON.parse(element.textContent) : null;

        return isTariffPublication(publication) ? publication : null;
    } catch {
        return null;
    }
}
