export function LegacyMaterialSalesSettings({
    form,
    onChange,
    disabled,
}) {
    return (
        <section className="tariffs-admin-card tariffs-admin-card--materials">
            <header>
                <span>Будущая платёжная модель</span>
                <h3>Продажа материалов через каталог</h3>
            </header>

            <div className="tariffs-admin-materials-grid">
                <label className="tariffs-admin-field">
                    <span>Комиссия с продажи, %</span>
                    <input type="number" name="materials_sale_commission_percent" value={form.materials_sale_commission_percent} onChange={onChange} min="0" max="100" step="1" disabled={disabled} required />
                </label>
                <div className="tariffs-admin-calculated">
                    <span>Автор получает</span>
                    <strong>
                        {Math.max(0, 100 - Number(form.materials_sale_commission_percent || 0))}%
                    </strong>
                </div>
                <label className="tariffs-admin-field">
                    <span>Период возврата, дней</span>
                    <input type="number" name="materials_payout_hold_days" value={form.materials_payout_hold_days} onChange={onChange} min="0" max="366" step="1" disabled={disabled} required />
                </label>
            </div>

            <div className="tariffs-admin-fields-grid">
                <label className="tariffs-admin-field">
                    <span>Продажа для физического лица</span>
                    <textarea name="materials_individual_sales_text" value={form.materials_individual_sales_text} onChange={onChange} rows={4} maxLength={700} disabled={disabled} required />
                </label>
                <label className="tariffs-admin-field">
                    <span>Продажа для самозанятого / ИП</span>
                    <textarea name="materials_business_sales_text" value={form.materials_business_sales_text} onChange={onChange} rows={4} maxLength={700} disabled={disabled} required />
                </label>
            </div>

            <label className="tariffs-admin-field">
                <span>Личная и Профессиональная лицензии</span>
                <textarea name="materials_licenses_text" value={form.materials_licenses_text} onChange={onChange} rows={3} maxLength={700} disabled={disabled} required />
            </label>

            <label className="tariffs-admin-field">
                <span>Модерация, права автора и выплата</span>
                <textarea name="materials_moderation_text" value={form.materials_moderation_text} onChange={onChange} rows={4} maxLength={1000} disabled={disabled} required />
            </label>
        </section>
    );
}
