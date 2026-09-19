import { useState } from 'react';

import { useAccessibilityProgram } from './useAccessibilityProgram.js';
import { AccessibilityApplicationsSection } from '../AccessibilityApplications/AccessibilityApplicationsSection.jsx';
import './AccessibilitySection.css';

const OFFER_TYPES = [
    {
        key: 'free',
        title: 'Бесплатное обучение',
        description: 'Первое принятое место не входит в лимит тарифа преподавателя.',
    },
    {
        key: 'discount',
        title: 'Обучение со скидкой',
        description: 'Скидка автоматически применяется к стоимости 45, 60 и 90 минут.',
    },
    {
        key: 'individual',
        title: 'Индивидуальные условия',
        description: 'Цена и другие условия согласовываются с семьёй до начала занятий.',
    },
];

const STATUS_LABELS = {
    pending: 'На модерации',
    approved: 'Опубликовано',
    rejected: 'Отклонено',
};

function latestOffer(offers, type, status) {
    return offers.find((offer) => (
        offer.offer_type === type && offer.status === status
    )) || null;
}

function OfferEditor({
    definition,
    subjects,
    pending,
    published,
    rejected,
    isSaving,
    onSave,
    onArchive,
}) {
    const source = pending || rejected || published;
    const [slots, setSlots] = useState(source?.slots || 1);
    const [discountPercent, setDiscountPercent] = useState(
        source?.discount_percent || 25,
    );
    const [duration, setDuration] = useState(
        source
            ? (source.default_duration_months === null
                || source.default_duration_months === undefined
                ? ''
                : String(source.default_duration_months))
            : '3',
    );
    const [comment, setComment] = useState(source?.comment || '');
    const [subjectIds, setSubjectIds] = useState(
        source?.subjects?.map((subject) => subject.id) || [],
    );
    const [validationError, setValidationError] = useState('');

    function toggleSubject(subjectId) {
        setSubjectIds((current) => (
            current.includes(subjectId)
                ? current.filter((id) => id !== subjectId)
                : [...current, subjectId]
        ));
    }

    async function submit(event) {
        event.preventDefault();
        if (!subjectIds.length) {
            setValidationError('Выберите хотя бы один предмет');
            return;
        }
        setValidationError('');
        await onSave({
            offer_type: definition.key,
            slots: Number(slots),
            discount_percent: definition.key === 'discount'
                ? Number(discountPercent)
                : null,
            default_duration_months: duration ? Number(duration) : null,
            subject_ids: subjectIds,
            comment: comment.trim(),
        });
    }

    const statusOffer = pending || rejected || published;

    return (
        <form className="accessibility-offer" onSubmit={submit}>
            <header>
                <div>
                    <h3>{definition.title}</h3>
                    <p>{definition.description}</p>
                </div>
                {statusOffer && (
                    <span className={`accessibility-offer__status is-${statusOffer.status}`}>
                        {STATUS_LABELS[statusOffer.status] || statusOffer.status}
                    </span>
                )}
            </header>

            {pending && published && (
                <p className="accessibility-offer__info">
                    Опубликованные условия действуют, пока новые проходят модерацию.
                </p>
            )}
            {rejected?.moderation_comment && !pending && (
                <p className="accessibility-offer__rejection">
                    Причина: {rejected.moderation_comment}
                </p>
            )}

            <fieldset>
                <legend>Предметы</legend>
                <div className="accessibility-offer__subjects">
                    {subjects.map((subject) => (
                        <label key={subject.id}>
                            <input
                                type="checkbox"
                                checked={subjectIds.includes(subject.id)}
                                onChange={() => toggleSubject(subject.id)}
                            />
                            <span>{subject.name}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="accessibility-offer__fields">
                <label>
                    <span>Количество мест</span>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={slots}
                        onChange={(event) => setSlots(event.target.value)}
                    />
                </label>

                {definition.key === 'discount' && (
                    <label>
                        <span>Размер скидки</span>
                        <select
                            value={discountPercent}
                            onChange={(event) => setDiscountPercent(event.target.value)}
                        >
                            {Array.from({ length: 17 }, (_, index) => 10 + index * 5)
                                .map((value) => (
                                    <option key={value} value={value}>{value}%</option>
                                ))}
                        </select>
                    </label>
                )}

                <label>
                    <span>Срок по умолчанию</span>
                    <select
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                    >
                        <option value="">Без ограничения</option>
                        <option value="1">1 месяц</option>
                        <option value="3">3 месяца</option>
                        <option value="6">6 месяцев</option>
                        <option value="12">12 месяцев</option>
                    </select>
                </label>
            </div>

            <label className="accessibility-offer__comment">
                <span>Описание условий</span>
                <textarea
                    rows="4"
                    maxLength="2000"
                    value={comment}
                    placeholder="Кому и в каком формате вы готовы помочь"
                    onChange={(event) => setComment(event.target.value)}
                />
            </label>

            {validationError && (
                <p className="accessibility-offer__validation">{validationError}</p>
            )}

            <footer>
                {statusOffer && (
                    <button
                        type="button"
                        className="accessibility-offer__secondary"
                        disabled={isSaving}
                        onClick={() => onArchive(pending || rejected || published)}
                    >
                        {pending ? 'Отменить отправку' : 'Закрыть предложение'}
                    </button>
                )}
                <button type="submit" disabled={isSaving || !subjects.length}>
                    {isSaving
                        ? 'Сохраняем...'
                        : statusOffer
                            ? 'Отправить изменения'
                            : 'Отправить на модерацию'}
                </button>
            </footer>
        </form>
    );
}

export function AccessibilitySection({ initialTab = 'offers' }) {
    const [activeTab, setActiveTab] = useState(
        initialTab === 'applications' ? 'applications' : 'offers',
    );
    const controller = useAccessibilityProgram(activeTab === 'offers');

    let offersContent = null;

    if (activeTab === 'offers') {
        if (controller.status === 'idle' || controller.status === 'loading') {
            offersContent = (
                <div className="accessibility-program--state">
                    Загружаем программу...
                </div>
            );
        } else if (controller.status === 'error' && !controller.offers.length) {
            offersContent = (
                <div className="accessibility-program--state">
                    <p>{controller.error}</p>
                    <button type="button" onClick={controller.refresh}>Повторить</button>
                </div>
            );
        } else {
            offersContent = (
                <>
                    {controller.error && <p className="accessibility-program__error">{controller.error}</p>}
                    {controller.notice && <p className="accessibility-program__notice">{controller.notice}</p>}
                    {!controller.subjects.length && (
                        <p className="accessibility-program__error">
                            Сначала добавьте предметы в анкету преподавателя.
                        </p>
                    )}

                    <div className="accessibility-program__offers">
                        {OFFER_TYPES.map((definition) => {
                            const pending = latestOffer(controller.offers, definition.key, 'pending');
                            const published = latestOffer(controller.offers, definition.key, 'approved');
                            const rejected = latestOffer(controller.offers, definition.key, 'rejected');
                            const source = pending || rejected || published;

                            return (
                                <OfferEditor
                                    key={`${definition.key}:${source?.id || 'new'}`}
                                    definition={definition}
                                    subjects={controller.subjects}
                                    pending={pending}
                                    published={published}
                                    rejected={rejected}
                                    isSaving={controller.savingType === definition.key}
                                    onSave={controller.saveOffer}
                                    onArchive={controller.archiveOffer}
                                />
                            );
                        })}
                    </div>
                </>
            );
        }
    }

    return (
        <section className="accessibility-program">
            <header className="accessibility-program__header">
                <div>
                    <span>Программа GoStudy</span>
                    <h2>Доступное образование</h2>
                    <p>
                        Настраивайте условия помощи и рассматривайте обращения
                        семей в одном разделе.
                    </p>
                </div>
                {activeTab === 'offers' && (
                    <aside>
                        Первое бесплатное место не входит в лимит тарифа. Второе и
                        последующие места учитываются по обычным правилам тарифа.
                    </aside>
                )}
            </header>

            <nav className="accessibility-program__tabs" aria-label="Разделы доступного образования">
                <button
                    type="button"
                    className={activeTab === 'offers' ? 'is-active' : ''}
                    onClick={() => setActiveTab('offers')}
                >
                    Предложения
                </button>
                <button
                    type="button"
                    className={activeTab === 'applications' ? 'is-active' : ''}
                    onClick={() => setActiveTab('applications')}
                >
                    Заявки
                </button>
            </nav>

            {activeTab === 'applications'
                ? <AccessibilityApplicationsSection embedded />
                : offersContent}
        </section>
    );
}
