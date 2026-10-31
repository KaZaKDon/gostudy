import { useCallback, useEffect, useState } from 'react';
import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';
import './SubscriptionTestPanel.css';

const money = (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value);

export function SubscriptionTestPanel() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [blocks, setBlocks] = useState(0);
    const [acknowledged, setAcknowledged] = useState(false);
    const [busy, setBusy] = useState(false);
    const load = useCallback(async (signal) => {
        try {
            const result = await apiRequest(API.subscriptionMe, { signal });
            setData(result.data);
            setError('');
        } catch (error) {
            if (!signal?.aborted) setError(error.message);
        }
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        apiRequest(API.subscriptionMe, { signal: controller.signal }).then((result) => {
            if (!controller.signal.aborted) setData(result.data);
        }).catch((error) => {
            if (!controller.signal.aborted) setError(error.message);
        });
        return () => controller.abort();
    }, []);

    // Disabled integration adds no new payment UI to existing accounts.
    if (data && !data.test_available) return null;
    const tariff = data?.tariff;
    async function checkout(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const response = await apiRequest(API.subscriptionTestCheckout, { method: 'POST', body: {
                extra_blocks: blocks, tariff_version: tariff.version, test_acknowledged: acknowledged,
            } });
            const { action, fields } = response.data;
            if (action !== 'https://auth.robokassa.ru/Merchant/Index.aspx' || fields.IsTest !== '1') {
                throw new Error('Некорректная тестовая форма');
            }
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = action;
            for (const [name, value] of Object.entries(fields)) {
                const input = document.createElement('input');
                input.type = 'hidden'; input.name = name; input.value = String(value);
                form.append(input);
            }
            document.body.append(form);
            form.submit();
            form.remove();
        } catch (error) {
            setError(error.message);
            setBusy(false);
        }
    }
    return (
        <section className="subscription-test" aria-label="Проверка оплаты подписки">
            <h3>Проверка оплаты подписки</h3>
            <p>Тестовый режим Robokassa. Деньги не списываются. Автопродление не подключается.</p>
            {error && <p role="alert">{error}</p>}
            {tariff && <form onSubmit={checkout}>
                <p>{tariff.title}: {money(tariff.price_rubles)} / {tariff.period_days} дней,
                    {' '}до {tariff.students_included} учеников.</p>
                <label>Дополнительные блоки по {tariff.extra_block_students} ученика
                    <select value={blocks} onChange={(event) => setBlocks(Number(event.target.value))} disabled={busy}>
                        {Array.from({ length: 101 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
                <p><strong>Тестовая сумма: {money(tariff.price_rubles + blocks * tariff.extra_block_price_rubles)}</strong></p>
                <label className="subscription-test__check">
                    <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={busy} />
                    Проверяю тестовую оплату. Она не является покупкой подписки.
                </label>
                <button type="submit" disabled={!acknowledged || busy}>{busy ? 'Переходим…' : 'Проверить оплату в Robokassa'}</button>
            </form>}
            {data?.trial && <p>Тестовый период до {new Date(data.trial.expires_at).toLocaleString('ru-RU')}.
                {' '}Учеников: {data.trial.students}. Это запись проверки, а не оплаченный доступ.</p>}
            {data?.payments.length > 0 && <ul>
                {data.payments.map((payment) => <li key={payment.id}>
                    Тест №{payment.id} · {money(payment.amount_rubles)} · {payment.status === 'paid' ? 'Подтверждён сервером' : 'Ожидает подтверждения'}
                </li>)}
            </ul>}
            <button type="button" onClick={() => load()} disabled={busy}>Обновить статус</button>
        </section>
    );
}
