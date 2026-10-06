import {
    BadgeRussianRuble,
    CalendarClock,
    Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function formatRubles(value) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

export function CommissionTariffCard({ tariff }) {
    return (
        <article className="pricing-receipt pricing-receipt--business">
            <div className="pricing-receipt__topline">
                <span>{tariff.badge}</span>
                <BadgeRussianRuble aria-hidden="true" />
            </div>

            <h2>{tariff.title}</h2>
            <p className="pricing-receipt__summary">{tariff.summary}</p>

            <div className="pricing-receipt__price">
                <strong>{tariff.commission_percent}%</strong>
                <span>комиссия GoStudy</span>
            </div>

            <div className="pricing-receipt__formula">
                <div>
                    <span>Выплата</span>
                    <strong>{tariff.payout_frequency}</strong>
                </div>
                <div>
                    <span>Минимальная сумма</span>
                    <strong>{formatRubles(tariff.minimum_payout_rubles)}</strong>
                </div>
            </div>

            <ul className="pricing-receipt__features">
                {tariff.features.map((feature) => (
                    <li key={feature}>
                        <Check aria-hidden="true" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <div className="pricing-receipt__note">
                <CalendarClock aria-hidden="true" />
                <p>{tariff.settlement_text}</p>
            </div>

            <Link to="/register?role=teacher">Зарегистрироваться</Link>
        </article>
    );
}
