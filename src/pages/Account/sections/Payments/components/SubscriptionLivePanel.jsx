import { useEffect, useState } from 'react';
import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';
import './SubscriptionLivePanel.css';

const money = (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value);
const date = (value) => new Date(value).toLocaleString('ru-RU');
const receiptLabels = {
    scheduled: 'Итоговый чек запланирован на конец периода', submitted: 'Итоговый чек обрабатывается',
    registered: 'Итоговый чек зарегистрирован', review: 'Статус итогового чека проверяет поддержка', held: 'Итоговый чек на проверке',
};
export function SubscriptionLivePanel() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [blocks, setBlocks] = useState(0);
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        apiRequest(API.subscriptionLive, { signal: controller.signal }).then((result) => {
            if (!controller.signal.aborted) setData(result.data);
        }).catch((err) => { if (!controller.signal.aborted) setError(err.message); });
        return () => controller.abort();
    }, []);
    async function refresh() {
        setBusy(true);
        setAccepted(false);
        try { const result = await apiRequest(API.subscriptionLive); setData(result.data); setError(''); }
        catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }
    async function checkout(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const result = await apiRequest(API.subscriptionCheckout, { method: 'POST', body: {
                extra_blocks: blocks, tariff_version: data.tariff.version, terms_version: data.terms_version, terms_accepted: accepted,
            } });
            const { action, fields } = result.data;
            if (action !== 'https://auth.robokassa.ru/Merchant/Index.aspx' || fields.IsTest !== '0' || !fields.Receipt) {
                throw new Error('Не удалось подготовить оплату. Обновите страницу.');
            }
            const form = document.createElement('form');
            form.method = 'POST'; form.action = action;
            for (const [name, value] of Object.entries(fields)) {
                const input = document.createElement('input');
                input.type = 'hidden'; input.name = name; input.value = String(value); form.append(input);
            }
            document.body.append(form); form.submit(); form.remove();
        } catch (err) { setError(err.message); setBusy(false); setAccepted(false); }
    }
    if (!data) return error ? <p role="alert">Не удалось проверить подписку: {error}</p> : null;
    if (!data.available && !data.payments.length && !data.periods.length) return null;
    const tariff = data.tariff;
    const total = tariff ? tariff.price_rubles + blocks * tariff.extra_block_price_rubles : 0;
    const students = tariff ? tariff.students_included + blocks * tariff.extra_block_students : 0;
    return <section className="subscription-live" aria-label="Оплата подписки GoStudy">
        <div className="subscription-live__heading"><h3>Подписка GoStudy</h3><span>Разовая оплата · без автосписаний</span></div>
        {error && <p role="alert">{error}</p>}
        {data.periods.length > 0 && <ul className="subscription-live__periods">
            {data.periods.map((period) => <li key={period.starts_at}>
                {new Date(period.starts_at) > new Date() ? 'Следующий период' : 'Оплаченный период'}:
                {' '}{date(period.starts_at)} — {date(period.ends_at)}. До {period.students} учеников.
            </li>)}
        </ul>}
        {data.available && tariff ? <form onSubmit={checkout}>
            <p>Оплата доступа на {tariff.period_days} дней. При продлении новый период начнётся после текущего.
                Дополнительные места выбираются для нового периода целиком.</p>
            <label className="subscription-live__select">Дополнительные блоки по {tariff.extra_block_students} ученика
                <select value={blocks} disabled={busy} onChange={(event) => { setBlocks(Number(event.target.value)); setAccepted(false); }}>
                    {Array.from({ length: 101 }, (_, n) => <option key={n} value={n}>{n} — {money(n * tariff.extra_block_price_rubles)}</option>)}
                </select>
            </label>
            <p className="subscription-live__total">{money(total)} <span>/ {tariff.period_days} дней · до {students} учеников</span></p>
            <p>Чек придёт на подтверждённую почту аккаунта. После окончания периода будет сформирован итоговый чек.</p>
            <label className="subscription-live__consent">
                <input type="checkbox" checked={accepted} disabled={busy} onChange={(event) => setAccepted(event.target.checked)} />
                <span>Принимаю <a href="/legal/offer" target="_blank" rel="noreferrer">оферту</a> и
                    {' '}<a href="/legal/tariffs" target="_blank" rel="noreferrer">условия тарифа</a>.
                    Оплачиваю {money(total)} за {tariff.period_days} дней. Автосписаний нет.</span>
            </label>
            <button className="subscription-live__pay" type="submit" disabled={busy || !accepted}>{busy ? 'Переходим к оплате…' : `Оплатить ${money(total)}`}</button>
        </form> : <p>Приём новых оплат временно закрыт. История и оплаченные периоды сохранены.</p>}
        {data.payments.length > 0 && <details><summary>История оплат</summary><ul>
            {data.payments.map((payment) => <li key={payment.id}>№{payment.id} · {money(payment.amount_rubles)} ·
                {' '}{payment.status === 'paid' ? 'Оплачен' : 'Ожидает оплаты'}
                {payment.receipt_status && <>. {receiptLabels[payment.receipt_status] || 'Проверяем итоговый чек'}.</>}
            </li>)}
        </ul></details>}
        <button type="button" onClick={refresh} disabled={busy}>Обновить статус</button>
    </section>;
}
