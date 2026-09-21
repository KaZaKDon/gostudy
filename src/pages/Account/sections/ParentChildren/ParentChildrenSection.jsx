import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Link } from 'react-router-dom';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';
import {
    getAge,
    getMinorBirthDateLimits,
} from '../../../../utils/birthDate.js';
import { CreateStudentAccountForm } from './CreateStudentAccountForm.jsx';
import { LinkExistingStudentForm } from './LinkExistingStudentForm.jsx';

import './ParentChildrenSection.css';

const REPRESENTATIVE_OPTIONS = [
    { value: 'parent', label: 'Родитель' },
    { value: 'guardian', label: 'Опекун' },
    { value: 'trustee', label: 'Попечитель' },
];

const VERIFICATION_LABELS = {
    pending: 'Ожидает подтверждения',
    verified: 'Подтверждён',
    rejected: 'Отклонён',
};

function createEmptyForm() {
    return {
        lastName: '',
        firstName: '',
        middleName: '',
        birthDate: '',
        city: '',
        classLevel: '',
        representativeType: 'parent',
        consentAccepted: false,
    };
}

export function ParentChildrenSection() {
    const birthDateLimits = useMemo(() => getMinorBirthDateLimits(), []);
    const [children, setChildren] = useState([]);
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState(createEmptyForm);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        let isActive = true;

        const loadChildren = async () => {
            try {
                const result = await apiRequest(API.parentChildren);

                if (isActive) {
                    setChildren(
                        Array.isArray(result.children) ? result.children : [],
                    );
                    setStatus('success');
                }
            } catch (error) {
                if (isActive) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Не удалось загрузить карточки детей',
                    );
                    setStatus('error');
                }
            }
        };

        loadChildren();

        return () => {
            isActive = false;
        };
    }, []);

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaveStatus('saving');
        setSaveMessage('');

        try {
            const result = await apiRequest(API.parentChildren, {
                method: 'POST',
                body: {
                    last_name: form.lastName,
                    first_name: form.firstName,
                    middle_name: form.middleName || undefined,
                    birth_date: form.birthDate,
                    city: form.city || undefined,
                    timezone: Intl.DateTimeFormat()
                        .resolvedOptions().timeZone || undefined,
                    class_level: form.classLevel || undefined,
                    representative_type: form.representativeType,
                    legal_acceptance: {
                        accepted: form.consentAccepted,
                    },
                },
            });

            setChildren((current) => [...current, result.child]);
            setForm(createEmptyForm());
            setSaveStatus('success');
            setSaveMessage(result.message);
            setIsFormOpen(false);
        } catch (error) {
            setSaveStatus('error');
            setSaveMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось создать карточку ребёнка',
            );
        }
    };

    return (
        <section className="parent-children">
            <header className="parent-children__header">
                <div>
                    <span>Семья</span>
                    <h2>Мои дети</h2>
                    <p>
                        Сначала создаётся карточка ребёнка. Собственный вход
                        ученика подключается после подтверждения связи.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setIsFormOpen((current) => !current);
                        setSaveMessage('');
                    }}
                >
                    {isFormOpen ? 'Закрыть форму' : 'Добавить ребёнка'}
                </button>
            </header>

            {isFormOpen && (
                <form
                    className="parent-child-form"
                    onSubmit={handleSubmit}
                >
                    <header>
                        <span>Новая карточка</span>
                        <h3>Данные ребёнка</h3>
                    </header>

                    <div className="parent-child-form__grid">
                        <label>
                            <span>Фамилия</span>
                            <input
                                value={form.lastName}
                                onChange={(event) => updateField(
                                    'lastName',
                                    event.target.value,
                                )}
                                maxLength={120}
                                autoComplete="off"
                                required
                            />
                        </label>

                        <label>
                            <span>Имя</span>
                            <input
                                value={form.firstName}
                                onChange={(event) => updateField(
                                    'firstName',
                                    event.target.value,
                                )}
                                maxLength={120}
                                autoComplete="off"
                                required
                            />
                        </label>

                        <label>
                            <span>Отчество</span>
                            <input
                                value={form.middleName}
                                onChange={(event) => updateField(
                                    'middleName',
                                    event.target.value,
                                )}
                                maxLength={120}
                                autoComplete="off"
                            />
                        </label>

                        <label>
                            <span>Дата рождения</span>
                            <input
                                type="date"
                                value={form.birthDate}
                                min={birthDateLimits.min}
                                max={birthDateLimits.max}
                                onChange={(event) => updateField(
                                    'birthDate',
                                    event.target.value,
                                )}
                                required
                            />
                        </label>

                        <label>
                            <span>Город</span>
                            <input
                                value={form.city}
                                onChange={(event) => updateField(
                                    'city',
                                    event.target.value,
                                )}
                                maxLength={120}
                            />
                        </label>

                        <label>
                            <span>Класс или уровень</span>
                            <input
                                value={form.classLevel}
                                onChange={(event) => updateField(
                                    'classLevel',
                                    event.target.value,
                                )}
                                maxLength={120}
                                placeholder="Например, 6 класс"
                            />
                        </label>

                        <label className="parent-child-form__wide">
                            <span>Вы являетесь</span>
                            <select
                                value={form.representativeType}
                                onChange={(event) => updateField(
                                    'representativeType',
                                    event.target.value,
                                )}
                            >
                                {REPRESENTATIVE_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="parent-child-form__consent">
                        <input
                            type="checkbox"
                            checked={form.consentAccepted}
                            onChange={(event) => updateField(
                                'consentAccepted',
                                event.target.checked,
                            )}
                            required
                        />

                        <span>
                            Я подтверждаю, что являюсь законным представителем,
                            и даю отдельное{' '}
                            <Link
                                to="/legal/parent-child-data-consent"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                согласие на обработку данных ребёнка
                            </Link>
                            .
                        </span>
                    </label>

                    {saveMessage && (
                        <p
                            className={
                                saveStatus === 'error'
                                    ? 'parent-child-form__message is-error'
                                    : 'parent-child-form__message is-success'
                            }
                        >
                            {saveMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            saveStatus === 'saving'
                            || !form.consentAccepted
                        }
                    >
                        {saveStatus === 'saving'
                            ? 'Сохраняем...'
                            : 'Создать карточку'}
                    </button>
                </form>
            )}

            {!isFormOpen && saveMessage && (
                <p className="parent-children__notice">
                    {saveMessage}
                </p>
            )}

            {status === 'loading' && (
                <p className="parent-children__state">
                    Загружаем карточки детей...
                </p>
            )}

            {status === 'error' && (
                <p className="parent-children__state is-error">
                    {errorMessage}
                </p>
            )}

            {status === 'success' && children.length === 0 && (
                <div className="parent-children__empty">
                    <h3>Пока нет добавленных детей</h3>
                    <p>
                        Нажмите «Добавить ребёнка». Почта и пароль ребёнка на
                        этом шаге не требуются.
                    </p>
                </div>
            )}

            {children.length > 0 && (
                <div className="parent-children__list">
                    {children.map((child) => (
                        <article key={child.id} className="parent-child-card">
                            <div>
                                <span>Ребёнок</span>
                                <h3>{child.full_name}</h3>
                            </div>

                            <dl>
                                <div>
                                    <dt>Возраст</dt>
                                    <dd>{getAge(child.birth_date)} лет</dd>
                                </div>
                                <div>
                                    <dt>Класс / уровень</dt>
                                    <dd>{child.class_level || 'Не указан'}</dd>
                                </div>
                                <div>
                                    <dt>Город</dt>
                                    <dd>{child.city || 'Не указан'}</dd>
                                </div>
                            </dl>

                            <footer>
                                <span
                                    className={`parent-child-card__status is-${child.verification_status}`}
                                >
                                    {VERIFICATION_LABELS[
                                        child.verification_status
                                    ] || child.verification_status}
                                </span>

                                <small>
                                    {child.student_account_created
                                        ? 'Аккаунт ученика привязан'
                                        : child.verification_status === 'verified'
                                            ? 'Можно подключить аккаунт ученика'
                                            : 'Ученический вход ещё не создан'}
                                </small>
                            </footer>

                            {child.verification_comment && (
                                <p className="parent-child-card__comment">
                                    <strong>Комментарий проверки:</strong>{' '}
                                    {child.verification_comment}
                                </p>
                            )}

                            <LinkExistingStudentForm
                                child={child}
                                onRequestCreated={(request) => {
                                    setChildren((current) => current.map(
                                        (item) => item.id === child.id
                                            ? { ...item, link_request: request }
                                            : item,
                                    ));
                                }}
                            />

                            <CreateStudentAccountForm
                                child={child}
                                onAccountCreated={(student, message) => {
                                    setChildren((current) => current.map(
                                        (item) => item.id === child.id
                                            ? {
                                                ...item,
                                                student_id: student.id,
                                                student_account_created: true,
                                                linked_student_email: student.email,
                                                link_request: null,
                                            }
                                            : item,
                                    ));
                                    setSaveStatus('success');
                                    setSaveMessage(message);
                                }}
                            />
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
