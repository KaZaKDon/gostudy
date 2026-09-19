import { useEffect, useState } from 'react';

import { useAdminAuth } from '../../auth/useAdminAuth.js';
import { tariffsApi } from '../../services/tariffsApi.js';

import './tariffs-admin.css';

const EMPTY_FORM = {
    page_title: '',
    page_lead: '',
    individual_title: '',
    individual_badge: '',
    individual_summary: '',
    individual_price_rubles: 0,
    individual_period_days: 30,
    individual_students_included: 2,
    individual_extra_block_students: 2,
    individual_extra_block_price_rubles: 0,
    individual_recalculation_text: '',
    individual_features_text: '',
    business_title: '',
    business_badge: '',
    business_summary: '',
    business_commission_percent: 0,
    business_minimum_payout_rubles: 0,
    business_payout_frequency: '',
    business_settlement_text: '',
    business_features_text: '',
    materials_title: 'Учебные материалы',
    materials_lead: 'Личная библиотека и материалы для занятий входят в оба варианта. Публикация в общем каталоге проходит модерацию.',
    materials_personal_library_text: 'Личная библиотека, материалы для уроков, домашних заданий и передача своим ученикам включены в тариф.',
    materials_free_catalog_text: 'Бесплатные материалы можно публиковать в общем каталоге GoStudy после модерации.',
    materials_individual_sales_text: 'Продажа платных материалов через GoStudy недоступна для физического лица без подтверждённого статуса самозанятого или ИП.',
    materials_business_sales_text: 'Подтверждённые самозанятые и ИП могут продавать собственные материалы через каталог GoStudy.',
    materials_sale_commission_percent: 25,
    materials_payout_hold_days: 7,
    materials_licenses_text: 'Автор самостоятельно устанавливает цены Личной и Профессиональной лицензий в рублях в пределах правил платформы.',
    materials_moderation_text: 'Каждый материал для общего каталога проходит модерацию. Автор подтверждает права на публикацию, а выплата за платный материал производится после периода возврата при отсутствии спора.',
    notice: '',
};

const STATUS_LABELS = {
    draft: 'Черновик',
    published: 'Опубликован',
    archived: 'Архив',
};

function publicationToForm(publication) {
    const content = publication?.content;

    if (!content?.individual || !content?.business) {
        return EMPTY_FORM;
    }

    const materials = content.materials ?? {};

    return {
        page_title: content.page_title ?? '',
        page_lead: content.page_lead ?? '',
        individual_title: content.individual.title ?? '',
        individual_badge: content.individual.badge ?? '',
        individual_summary: content.individual.summary ?? '',
        individual_price_rubles: content.individual.price_rubles ?? 0,
        individual_period_days: content.individual.period_days ?? 30,
        individual_students_included:
            content.individual.students_included ?? 2,
        individual_extra_block_students:
            content.individual.extra_block_students ?? 2,
        individual_extra_block_price_rubles:
            content.individual.extra_block_price_rubles ?? 0,
        individual_recalculation_text:
            content.individual.recalculation_text ?? '',
        individual_features_text:
            (content.individual.features ?? []).join('\n'),
        business_title: content.business.title ?? '',
        business_badge: content.business.badge ?? '',
        business_summary: content.business.summary ?? '',
        business_commission_percent:
            content.business.commission_percent ?? 0,
        business_minimum_payout_rubles:
            content.business.minimum_payout_rubles ?? 0,
        business_payout_frequency:
            content.business.payout_frequency ?? '',
        business_settlement_text:
            content.business.settlement_text ?? '',
        business_features_text:
            (content.business.features ?? []).join('\n'),
        materials_title:
            materials.title ?? EMPTY_FORM.materials_title,
        materials_lead:
            materials.lead ?? EMPTY_FORM.materials_lead,
        materials_personal_library_text:
            materials.personal_library_text
            ?? EMPTY_FORM.materials_personal_library_text,
        materials_free_catalog_text:
            materials.free_catalog_text
            ?? EMPTY_FORM.materials_free_catalog_text,
        materials_individual_sales_text:
            materials.individual_sales_text
            ?? EMPTY_FORM.materials_individual_sales_text,
        materials_business_sales_text:
            materials.business_sales_text
            ?? EMPTY_FORM.materials_business_sales_text,
        materials_sale_commission_percent:
            materials.sale_commission_percent
            ?? EMPTY_FORM.materials_sale_commission_percent,
        materials_payout_hold_days:
            materials.payout_hold_days
            ?? EMPTY_FORM.materials_payout_hold_days,
        materials_licenses_text:
            materials.licenses_text ?? EMPTY_FORM.materials_licenses_text,
        materials_moderation_text:
            materials.moderation_text
            ?? EMPTY_FORM.materials_moderation_text,
        notice: content.notice ?? '',
    };
}

function featureLines(value) {
    return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
}

function formToPayload(form) {
    const {
        individual_features_text: individualFeatures,
        business_features_text: businessFeatures,
        ...fields
    } = form;

    return {
        ...fields,
        individual_features: featureLines(individualFeatures),
        business_features: featureLines(businessFeatures),
    };
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export function TariffsAdminPage() {
    const { user } = useAdminAuth();
    const [form, setForm] = useState(EMPTY_FORM);
    const [active, setActive] = useState(null);
    const [draft, setDraft] = useState(null);
    const [history, setHistory] = useState([]);
    const [canEdit, setCanEdit] = useState(user?.role === 'admin');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    async function loadSettings({ preserveMessage = false } = {}) {
        setError('');

        if (!preserveMessage) {
            setSuccessMessage('');
        }

        try {
            const result = await tariffsApi.getSettings();
            const data = result.data;

            setActive(data.active);
            setDraft(data.draft);
            setHistory(data.history ?? []);
            setCanEdit(Boolean(data.can_edit));
            setForm(publicationToForm(data.draft ?? data.active));
            setIsDirty(false);
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
        let isActive = true;

        tariffsApi.getSettings()
            .then((result) => {
                if (!isActive) {
                    return;
                }

                const data = result.data;
                setActive(data.active);
                setDraft(data.draft);
                setHistory(data.history ?? []);
                setCanEdit(Boolean(data.can_edit));
                setForm(publicationToForm(data.draft ?? data.active));
                setIsDirty(false);
            })
            .catch((requestError) => {
                if (isActive) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : 'Не удалось загрузить тарифы',
                    );
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    function updateField(event) {
        const { name, type, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === 'number' ? Number(value) : value,
        }));
        setIsDirty(true);
        setError('');
        setSuccessMessage('');
    }

    async function handleSave(event) {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSaving(true);

        try {
            const result = await tariffsApi.saveDraft(formToPayload(form));
            setSuccessMessage(result.message);
            await loadSettings({ preserveMessage: true });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Не удалось сохранить черновик',
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handlePublish() {
        if (!draft || isDirty) {
            return;
        }

        const isConfirmed = window.confirm(
            `Опубликовать тариф v${draft.version}? Он сразу заменит действующую редакцию.`,
        );

        if (!isConfirmed) {
            return;
        }

        setError('');
        setSuccessMessage('');
        setIsPublishing(true);

        try {
            const result = await tariffsApi.publish();
            setSuccessMessage(result.message);
            await loadSettings({ preserveMessage: true });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Не удалось опубликовать тариф',
            );
        } finally {
            setIsPublishing(false);
        }
    }

    if (isLoading) {
        return (
            <div className="admin-page">
                <p className="admin-muted">Загружаем настройки тарифов...</p>
            </div>
        );
    }

    return (
        <div className="admin-page tariffs-admin-page">
            <div className="admin-page__head tariffs-admin-page__head">
                <div>
                    <p className="admin-page__eyebrow">Публикация условий</p>
                    <h2 className="admin-page__title">Тарифы</h2>
                    <p className="tariffs-admin-page__description">
                        Сначала сохраните изменения как черновик,
                        затем отдельно опубликуйте проверенную редакцию.
                    </p>
                </div>

                <div className="tariffs-admin-page__versions">
                    <span>
                        На сайте: <strong>v{active?.version ?? '—'}</strong>
                    </span>
                    <span>
                        Черновик: <strong>{draft ? `v${draft.version}` : 'нет'}</strong>
                    </span>
                </div>
            </div>

            {error && <div className="admin-alert">{error}</div>}

            {successMessage && (
                <div className="admin-alert tariffs-admin-page__success">
                    {successMessage}
                </div>
            )}

            {!canEdit && (
                <div className="tariffs-admin-page__readonly">
                    Модератор может просматривать тарифы. Сохранение
                    и публикация доступны только администратору.
                </div>
            )}

            <form className="tariffs-admin-form" onSubmit={handleSave}>
                <section className="tariffs-admin-card">
                    <header>
                        <span>Публичная страница</span>
                        <h3>Заголовок и введение</h3>
                    </header>

                    <label className="tariffs-admin-field">
                        <span>Заголовок страницы</span>
                        <input
                            name="page_title"
                            value={form.page_title}
                            onChange={updateField}
                            maxLength={120}
                            disabled={!canEdit || isSaving || isPublishing}
                            required
                        />
                    </label>

                    <label className="tariffs-admin-field">
                        <span>Вводный текст</span>
                        <textarea
                            name="page_lead"
                            value={form.page_lead}
                            onChange={updateField}
                            rows={3}
                            maxLength={500}
                            disabled={!canEdit || isSaving || isPublishing}
                            required
                        />
                    </label>
                </section>

                <section className="tariffs-admin-card tariffs-admin-card--individual">
                    <header>
                        <span>Подписочная модель</span>
                        <h3>Физическое лицо</h3>
                    </header>

                    <div className="tariffs-admin-fields-grid">
                        <label className="tariffs-admin-field">
                            <span>Название</span>
                            <input name="individual_title" value={form.individual_title} onChange={updateField} maxLength={100} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Метка</span>
                            <input name="individual_badge" value={form.individual_badge} onChange={updateField} maxLength={80} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <label className="tariffs-admin-field">
                        <span>Описание</span>
                        <textarea name="individual_summary" value={form.individual_summary} onChange={updateField} rows={3} maxLength={500} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>

                    <div className="tariffs-admin-numbers-grid">
                        <label className="tariffs-admin-field">
                            <span>Стоимость, ₽</span>
                            <input type="number" name="individual_price_rubles" value={form.individual_price_rubles} onChange={updateField} min="0" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Период, дней</span>
                            <input type="number" name="individual_period_days" value={form.individual_period_days} onChange={updateField} min="1" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Ученики в базе</span>
                            <input type="number" name="individual_students_included" value={form.individual_students_included} onChange={updateField} min="1" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Ученики в доп. блоке</span>
                            <input type="number" name="individual_extra_block_students" value={form.individual_extra_block_students} onChange={updateField} min="1" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Цена доп. блока, ₽</span>
                            <input type="number" name="individual_extra_block_price_rubles" value={form.individual_extra_block_price_rubles} onChange={updateField} min="0" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <label className="tariffs-admin-field">
                        <span>Правило перерасчёта</span>
                        <textarea name="individual_recalculation_text" value={form.individual_recalculation_text} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>

                    <label className="tariffs-admin-field">
                        <span>Преимущества — по одному в строке</span>
                        <textarea name="individual_features_text" value={form.individual_features_text} onChange={updateField} rows={6} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>
                </section>

                <section className="tariffs-admin-card tariffs-admin-card--business">
                    <header>
                        <span>Комиссионная модель</span>
                        <h3>Самозанятый / ИП</h3>
                    </header>

                    <div className="tariffs-admin-fields-grid">
                        <label className="tariffs-admin-field">
                            <span>Название</span>
                            <input name="business_title" value={form.business_title} onChange={updateField} maxLength={100} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Метка</span>
                            <input name="business_badge" value={form.business_badge} onChange={updateField} maxLength={80} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <label className="tariffs-admin-field">
                        <span>Описание</span>
                        <textarea name="business_summary" value={form.business_summary} onChange={updateField} rows={3} maxLength={500} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>

                    <div className="tariffs-admin-numbers-grid tariffs-admin-numbers-grid--business">
                        <label className="tariffs-admin-field">
                            <span>Комиссия, %</span>
                            <input type="number" name="business_commission_percent" value={form.business_commission_percent} onChange={updateField} min="0" max="100" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Минимальная выплата, ₽</span>
                            <input type="number" name="business_minimum_payout_rubles" value={form.business_minimum_payout_rubles} onChange={updateField} min="0" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Периодичность выплаты</span>
                            <input name="business_payout_frequency" value={form.business_payout_frequency} onChange={updateField} maxLength={100} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <label className="tariffs-admin-field">
                        <span>Правило начисления и выплаты</span>
                        <textarea name="business_settlement_text" value={form.business_settlement_text} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>

                    <label className="tariffs-admin-field">
                        <span>Преимущества — по одному в строке</span>
                        <textarea name="business_features_text" value={form.business_features_text} onChange={updateField} rows={6} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>
                </section>

                <section className="tariffs-admin-card tariffs-admin-card--materials">
                    <header>
                        <span>Материалы и каталог</span>
                        <h3>Публикация и продажа</h3>
                    </header>

                    <div className="tariffs-admin-fields-grid">
                        <label className="tariffs-admin-field">
                            <span>Заголовок блока</span>
                            <input name="materials_title" value={form.materials_title} onChange={updateField} maxLength={120} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Краткое введение</span>
                            <textarea name="materials_lead" value={form.materials_lead} onChange={updateField} rows={3} maxLength={500} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <div className="tariffs-admin-materials-grid">
                        <label className="tariffs-admin-field">
                            <span>Комиссия с продажи, %</span>
                            <input type="number" name="materials_sale_commission_percent" value={form.materials_sale_commission_percent} onChange={updateField} min="0" max="100" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <div className="tariffs-admin-calculated">
                            <span>Автор получает</span>
                            <strong>
                                {Math.max(0, 100 - Number(form.materials_sale_commission_percent || 0))}%
                            </strong>
                        </div>
                        <label className="tariffs-admin-field">
                            <span>Период возврата, дней</span>
                            <input type="number" name="materials_payout_hold_days" value={form.materials_payout_hold_days} onChange={updateField} min="0" max="366" step="1" disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <div className="tariffs-admin-fields-grid">
                        <label className="tariffs-admin-field">
                            <span>Личная библиотека и свои ученики</span>
                            <textarea name="materials_personal_library_text" value={form.materials_personal_library_text} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Бесплатная публикация в каталоге</span>
                            <textarea name="materials_free_catalog_text" value={form.materials_free_catalog_text} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Продажа для физического лица</span>
                            <textarea name="materials_individual_sales_text" value={form.materials_individual_sales_text} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                        <label className="tariffs-admin-field">
                            <span>Продажа для самозанятого / ИП</span>
                            <textarea name="materials_business_sales_text" value={form.materials_business_sales_text} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                        </label>
                    </div>

                    <label className="tariffs-admin-field">
                        <span>Личная и Профессиональная лицензии</span>
                        <textarea name="materials_licenses_text" value={form.materials_licenses_text} onChange={updateField} rows={3} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>

                    <label className="tariffs-admin-field">
                        <span>Модерация, права автора и выплата</span>
                        <textarea name="materials_moderation_text" value={form.materials_moderation_text} onChange={updateField} rows={4} maxLength={1000} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>
                </section>

                <section className="tariffs-admin-card">
                    <label className="tariffs-admin-field">
                        <span>Общее примечание под тарифами</span>
                        <textarea name="notice" value={form.notice} onChange={updateField} rows={4} maxLength={700} disabled={!canEdit || isSaving || isPublishing} required />
                    </label>
                </section>

                {canEdit && (
                    <div className="tariffs-admin-form__actions">
                        <button
                            className="tariffs-admin-button tariffs-admin-button--save"
                            type="submit"
                            disabled={isSaving || isPublishing}
                        >
                            {isSaving ? 'Сохраняем…' : 'Сохранить черновик'}
                        </button>

                        <button
                            className="tariffs-admin-button tariffs-admin-button--publish"
                            type="button"
                            onClick={handlePublish}
                            disabled={!draft || isDirty || isSaving || isPublishing}
                            title={isDirty ? 'Сначала сохраните изменения' : ''}
                        >
                            {isPublishing ? 'Публикуем…' : 'Опубликовать черновик'}
                        </button>
                    </div>
                )}
            </form>

            <section className="tariffs-admin-history" aria-labelledby="tariffs-history-title">
                <header>
                    <h3 id="tariffs-history-title">История редакций</h3>
                    <span>Последние 30 версий</span>
                </header>

                <div className="tariffs-admin-history__table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Версия</th>
                                <th>Статус</th>
                                <th>Начало действия</th>
                                <th>Обновлена</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item) => (
                                <tr key={item.id}>
                                    <td>v{item.version}</td>
                                    <td>
                                        <span className={`tariffs-admin-status tariffs-admin-status--${item.status}`}>
                                            {STATUS_LABELS[item.status] ?? item.status}
                                        </span>
                                    </td>
                                    <td>{formatDate(item.effective_from)}</td>
                                    <td>{formatDate(item.updated_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
