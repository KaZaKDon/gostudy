import {
    BadgeRussianRuble,
    BookOpen,
    Check,
    Library,
    ReceiptText,
    RefreshCcw,
    ShieldCheck,
    Store,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { API } from '../../api/api.js';
import { Footer } from '../../components/Footer/Footer.jsx';
import { Header } from '../../components/Header/Header.jsx';
import { CommissionTariffCard } from './components/CommissionTariffCard.jsx';

import './PricingPage.css';

function formatRubles(value) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function formatEffectiveDate(value) {
    const date = value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatBillingPeriod(days) {
    return `${days} дней`;
}

function isTariffContent(content) {
    return Boolean(
        content
        && content.individual
        && content.business
        && content.lesson_payments
        && content.materials
        && Array.isArray(content.individual.features)
        && Array.isArray(content.business.features)
        && typeof content.materials.sales_enabled === 'boolean'
        && Number.isFinite(content.materials.sale_commission_percent)
        && Number.isFinite(content.materials.payout_hold_days),
    );
}

async function requestTariffs(signal) {
    const response = await fetch(API.publicTariffs, { signal });
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Не удалось загрузить тарифы');
    }

    if (!isTariffContent(result.data?.content)) {
        throw new Error('Опубликованная редакция тарифов повреждена');
    }

    return result.data;
}

export function PricingPage() {
    const [publication, setPublication] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    async function handleRetry() {
        setIsLoading(true);
        setError('');

        try {
            setPublication(await requestTariffs());
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Не удалось загрузить тарифы',
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const controller = new AbortController();

        requestTariffs(controller.signal)
            .then((data) => setPublication(data))
            .catch((requestError) => {
                if (!(requestError instanceof DOMException
                    && requestError.name === 'AbortError')) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : 'Не удалось загрузить тарифы',
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => controller.abort();
    }, []);

    const content = publication?.content;
    const individual = content?.individual;
    const business = content?.business;
    const lessonPayments = content?.lesson_payments;
    const materials = content?.materials;
    const effectiveDate = formatEffectiveDate(publication?.effective_from);

    return (
        <main className="pricing-page">
            <Header />

            <div className="pricing-page__content">
                <Link className="pricing-page__back" to="/">
                    ← На главную
                </Link>

                {isLoading && (
                    <>
                        <header className="pricing-heading">
                            <p>GoStudy · прозрачные условия</p>
                            <h1>Тариф для преподавателей</h1>
                            <span>
                                Единая подписка на 30 дней открывает доступ
                                к рабочим функциям платформы. Актуальная
                                стоимость загружается с сервера GoStudy.
                            </span>
                        </header>
                        <section className="pricing-state" role="status">
                            <ReceiptText aria-hidden="true" />
                            <p>Загружаем действующую стоимость…</p>
                        </section>
                    </>
                )}

                {!isLoading && error && (
                    <section className="pricing-state pricing-state--error" role="alert">
                        <ReceiptText aria-hidden="true" />
                        <h1>Тарифы временно недоступны</h1>
                        <p>{error}</p>
                        <button type="button" onClick={handleRetry}>
                            Попробовать снова
                        </button>
                    </section>
                )}

                {!isLoading && content && individual && business && lessonPayments && materials && (
                    <>
                        <header className="pricing-heading">
                            <p>GoStudy · прозрачные условия</p>
                            <h1>{content.page_title}</h1>
                            <span>{content.page_lead}</span>
                        </header>

                        <section
                            className={`pricing-book ${lessonPayments.enabled ? '' : 'pricing-book--single'}`}
                            aria-label="Тариф преподавателя"
                        >
                            <article className="pricing-receipt pricing-receipt--individual">
                                <div className="pricing-receipt__topline">
                                    <span>{individual.badge}</span>
                                    <Users aria-hidden="true" />
                                </div>

                                <h2>{individual.title}</h2>
                                <p className="pricing-receipt__summary">
                                    {individual.summary}
                                </p>

                                <div className="pricing-receipt__price">
                                    <strong>{formatRubles(individual.price_rubles)}</strong>
                                    <span>за {formatBillingPeriod(individual.period_days)}</span>
                                </div>

                                <div className="pricing-receipt__formula">
                                    <div>
                                        <span>Включено</span>
                                        <strong>
                                            до {individual.students_included} учеников
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Расширение</span>
                                        <strong>
                                            +{formatRubles(individual.extra_block_price_rubles)}
                                            {' '}за следующие {individual.extra_block_students}
                                        </strong>
                                    </div>
                                </div>

                                <ul className="pricing-receipt__features">
                                    {individual.features.map((feature) => (
                                        <li key={feature}>
                                            <Check aria-hidden="true" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pricing-receipt__note">
                                    <RefreshCcw aria-hidden="true" />
                                    <div>
                                        <p>
                                            Подписка автоматически продлевается
                                            каждые {formatBillingPeriod(individual.period_days)} до отключения
                                            автопродления в личном кабинете.
                                        </p>
                                        <span>{individual.recalculation_text}</span>
                                    </div>
                                </div>

                                <Link to="/register?role=teacher">
                                    Зарегистрироваться
                                </Link>
                            </article>

                            {lessonPayments.enabled && business.enabled && (
                                <CommissionTariffCard tariff={business} />
                            )}

                        </section>

                        <aside className="pricing-direct-payment">
                            <BadgeRussianRuble aria-hidden="true" />
                            <div>
                                <p>{lessonPayments.title}</p>
                                <span>{lessonPayments.notice}</span>
                            </div>
                        </aside>

                        <section className="pricing-materials" aria-labelledby="pricing-materials-title">
                            <div className="pricing-materials__heading">
                                <BookOpen aria-hidden="true" />
                                <div>
                                    <p>Материалы преподавателя</p>
                                    <h2 id="pricing-materials-title">
                                        {materials.title}
                                    </h2>
                                    <span>{materials.lead}</span>
                                </div>
                            </div>

                            <div className={`pricing-materials__grid${materials.sales_enabled ? '' : ' pricing-materials__grid--single'}`}>
                                <article className="pricing-materials__card pricing-materials__card--included">
                                    <div className="pricing-materials__card-title">
                                        <Library aria-hidden="true" />
                                        <h3>Входит в подписку</h3>
                                    </div>
                                    <ul>
                                        <li>
                                            <Check aria-hidden="true" />
                                            <span>{materials.personal_library_text}</span>
                                        </li>
                                        <li>
                                            <Check aria-hidden="true" />
                                            <span>{materials.free_catalog_text}</span>
                                        </li>
                                    </ul>
                                </article>

                                {materials.sales_enabled && (
                                    <article className="pricing-materials__card pricing-materials__card--sales">
                                        <div className="pricing-materials__card-title">
                                            <Store aria-hidden="true" />
                                            <h3>Продажа через каталог</h3>
                                        </div>
                                        <p>{materials.business_sales_text}</p>
                                        <div className="pricing-materials__figures">
                                            <div>
                                                <strong>{materials.sale_commission_percent}%</strong>
                                                <span>комиссия GoStudy</span>
                                            </div>
                                            <div>
                                                <strong>
                                                    {Math.max(0, 100 - materials.sale_commission_percent)}%
                                                </strong>
                                                <span>получает автор</span>
                                            </div>
                                            <div>
                                                <strong>{materials.payout_hold_days} дней</strong>
                                                <span>период возврата</span>
                                            </div>
                                        </div>
                                        <p className="pricing-materials__restriction">
                                            {materials.individual_sales_text}
                                        </p>
                                    </article>
                                )}
                            </div>

                            <div className="pricing-materials__details">
                                <ShieldCheck aria-hidden="true" />
                                <div>
                                    {materials.sales_enabled ? (
                                        <>
                                            <p>{materials.licenses_text}</p>
                                            <span>{materials.moderation_text}</span>
                                        </>
                                    ) : (
                                        <>
                                            <p>Платная продажа материалов отключена</p>
                                            <span>{materials.sales_notice}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="pricing-footer-note">
                            <ReceiptText aria-hidden="true" />
                            <div>
                                <p>{content.notice}</p>
                                <span>
                                    Редакция v{publication.version}
                                    {effectiveDate ? ` действует с ${effectiveDate}` : ''}.
                                </span>
                            </div>
                            <div className="pricing-footer-note__links">
                                <Link to="/legal/tariffs">
                                    Подробные условия
                                </Link>
                                <Link to="/payment-and-refunds">
                                    Оплата и возврат
                                </Link>
                            </div>
                        </section>
                    </>
                )}
            </div>

            <Footer />
        </main>
    );
}
