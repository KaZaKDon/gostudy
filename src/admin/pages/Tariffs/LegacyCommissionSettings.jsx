export function LegacyCommissionSettings({
    form,
    onChange,
    disabled,
}) {
    return (
        <section className="tariffs-admin-card tariffs-admin-card--business">
            <header>
                <span>Комиссионная модель</span>
                <h3>Самозанятый / ИП</h3>
            </header>

            <div className="tariffs-admin-fields-grid">
                <label className="tariffs-admin-field">
                    <span>Название</span>
                    <input name="business_title" value={form.business_title} onChange={onChange} maxLength={100} disabled={disabled} required />
                </label>
                <label className="tariffs-admin-field">
                    <span>Метка</span>
                    <input name="business_badge" value={form.business_badge} onChange={onChange} maxLength={80} disabled={disabled} required />
                </label>
            </div>

            <label className="tariffs-admin-field">
                <span>Описание</span>
                <textarea name="business_summary" value={form.business_summary} onChange={onChange} rows={3} maxLength={500} disabled={disabled} required />
            </label>

            <div className="tariffs-admin-numbers-grid tariffs-admin-numbers-grid--business">
                <label className="tariffs-admin-field">
                    <span>Комиссия, %</span>
                    <input type="number" name="business_commission_percent" value={form.business_commission_percent} onChange={onChange} min="0" max="100" step="1" disabled={disabled} required />
                </label>
                <label className="tariffs-admin-field">
                    <span>Минимальная выплата, ₽</span>
                    <input type="number" name="business_minimum_payout_rubles" value={form.business_minimum_payout_rubles} onChange={onChange} min="0" step="1" disabled={disabled} required />
                </label>
                <label className="tariffs-admin-field">
                    <span>Периодичность выплаты</span>
                    <input name="business_payout_frequency" value={form.business_payout_frequency} onChange={onChange} maxLength={100} disabled={disabled} required />
                </label>
            </div>

            <label className="tariffs-admin-field">
                <span>Правило начисления и выплаты</span>
                <textarea name="business_settlement_text" value={form.business_settlement_text} onChange={onChange} rows={4} maxLength={700} disabled={disabled} required />
            </label>

            <label className="tariffs-admin-field">
                <span>Преимущества — по одному в строке</span>
                <textarea name="business_features_text" value={form.business_features_text} onChange={onChange} rows={6} disabled={disabled} required />
            </label>
        </section>
    );
}
