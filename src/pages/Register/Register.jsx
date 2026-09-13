import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { API } from '../../api/api.js';
import { PasswordField } from '../../components/PasswordField/PasswordField.jsx';
import { buildRegistrationLegalAcceptances } from '../../data/legal/legalAcceptance.js';

import './Register.css';

export function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const requestedRole = searchParams.get('role');
    const initialRole = ['student', 'teacher', 'parent'].includes(
        requestedRole,
    )
        ? requestedRole
        : 'student';

    const [role, setRole] = useState(initialRole);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');

    const [arePlatformDocumentsAccepted, setArePlatformDocumentsAccepted] =
        useState(false);
    const [isPersonalDataAccepted, setIsPersonalDataAccepted] =
        useState(false);
    const [isMarketingAccepted, setIsMarketingAccepted] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRegister = async (event) => {
        event.preventDefault();

        setErrorMessage('');
        setSuccessMessage('');

        const normalizedEmail = email.trim().toLowerCase();

        if (role === 'parent' && fullName.trim().length < 3) {
            setErrorMessage('Укажите полное имя родителя.');
            return;
        }

        if (
            role === 'parent'
            && !/^[0-9+\s().-]{7,40}$/.test(phone.trim())
        ) {
            setErrorMessage('Укажите корректный телефон родителя.');
            return;
        }

        if (!arePlatformDocumentsAccepted) {
            setErrorMessage(
                'Необходимо принять документы платформы.',
            );
            return;
        }

        if (!isPersonalDataAccepted) {
            setErrorMessage(
                'Необходимо дать согласие на обработку персональных данных.',
            );
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Пароль должен содержать не менее 6 символов.');
            return;
        }

        if (password !== passwordRepeat) {
            setErrorMessage('Пароли не совпадают.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(API.register, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role,
                    email: normalizedEmail,
                    password,
                    ...(role === 'parent'
                        ? {
                            full_name: fullName.trim(),
                            phone: phone.trim(),
                        }
                        : {}),
                    legal_acceptances: buildRegistrationLegalAcceptances({
                        platformDocumentsAccepted:
                            arePlatformDocumentsAccepted,
                        personalDataAccepted: isPersonalDataAccepted,
                        marketingAccepted: isMarketingAccepted,
                    }),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'Ошибка регистрации',
                );
            }

            setSuccessMessage(
                result.message ||
                'Регистрация выполнена. Проверьте электронную почту.',
            );

            navigate(
                `/verify-email?email=${encodeURIComponent(normalizedEmail)}`
                    + `&mailSent=${result.mail_sent ? '1' : '0'}`,
                {
                    replace: true,
                },
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось выполнить регистрацию',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link className="auth-card__back" to="/">
                    ← На главную
                </Link>

                <h1>Регистрация</h1>

                <div className="auth-card__tabs">
                    <button
                        type="button"
                        className={role === 'student' ? 'is-active' : ''}
                        onClick={() => setRole('student')}
                    >
                        Ученик
                    </button>

                    <button
                        type="button"
                        className={role === 'teacher' ? 'is-active' : ''}
                        onClick={() => setRole('teacher')}
                    >
                        Учитель
                    </button>

                    <button
                        type="button"
                        className={role === 'parent' ? 'is-active' : ''}
                        onClick={() => setRole('parent')}
                    >
                        Родитель
                    </button>
                </div>

                <form
                    className="auth-card__form"
                    onSubmit={handleRegister}
                >
                    {role === 'parent' && (
                        <>
                            <p className="auth-card__role-note">
                                Создайте свой аккаунт. Данные ребёнка и
                                документы добавим отдельно после
                                подтверждения почты.
                            </p>

                            <label>
                                <span>Фамилия, имя и отчество</span>

                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(event) =>
                                        setFullName(event.target.value)
                                    }
                                    placeholder="Иванова Мария Сергеевна"
                                    autoComplete="name"
                                    minLength={3}
                                    maxLength={255}
                                    disabled={isLoading}
                                    required
                                />
                            </label>

                            <label>
                                <span>Телефон</span>

                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(event) =>
                                        setPhone(event.target.value)
                                    }
                                    placeholder="+7 900 000-00-00"
                                    autoComplete="tel"
                                    maxLength={40}
                                    disabled={isLoading}
                                    required
                                />
                            </label>
                        </>
                    )}

                    <label>
                        <span>Почта</span>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="example@mail.ru"
                            autoComplete="email"
                            disabled={isLoading}
                            required
                        />
                    </label>

                    <PasswordField
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        autoComplete="new-password"
                        minLength={6}
                        disabled={isLoading}
                        required
                    />

                    <PasswordField
                        label="Повторите пароль"
                        value={passwordRepeat}
                        onChange={(event) =>
                            setPasswordRepeat(event.target.value)
                        }
                        placeholder="Повторите пароль"
                        autoComplete="new-password"
                        minLength={6}
                        disabled={isLoading}
                        required
                    />

                    {errorMessage && (
                        <p className="auth-card__error">
                            {errorMessage}
                        </p>
                    )}

                    {successMessage && (
                        <p className="auth-card__success">
                            {successMessage}
                        </p>
                    )}

                    <fieldset className="auth-card__agreements">
                        <legend>Согласия и документы</legend>

                        <label className="auth-card__agreement">
                            <input
                                type="checkbox"
                                checked={arePlatformDocumentsAccepted}
                                onChange={(event) =>
                                    setArePlatformDocumentsAccepted(
                                        event.target.checked,
                                    )
                                }
                                disabled={isLoading}
                                required
                            />

                            <span>
                                Я принимаю{' '}
                                <Link
                                    to="/legal/agreement"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Пользовательское соглашение
                                </Link>{' '}
                                и{' '}
                                <Link
                                    to="/legal/rules"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Правила платформы
                                </Link>{' '}
                                и подтверждаю, что ознакомился с{' '}
                                <Link
                                    to="/legal/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Политикой конфиденциальности
                                </Link>
                                .
                            </span>
                        </label>

                        <label className="auth-card__agreement">
                            <input
                                type="checkbox"
                                checked={isPersonalDataAccepted}
                                onChange={(event) =>
                                    setIsPersonalDataAccepted(
                                        event.target.checked,
                                    )
                                }
                                disabled={isLoading}
                                required
                            />

                            <span>
                                Я даю{' '}
                                <Link
                                    to="/legal/personal-data-consent"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    согласие на обработку персональных данных
                                </Link>
                                .
                            </span>
                        </label>

                        <label className="auth-card__agreement auth-card__agreement--optional">
                            <input
                                type="checkbox"
                                checked={isMarketingAccepted}
                                onChange={(event) =>
                                    setIsMarketingAccepted(
                                        event.target.checked,
                                    )
                                }
                                disabled={isLoading}
                            />

                            <span>
                                Я согласен получать новости, специальные
                                предложения и{' '}
                                <Link
                                    to="/legal/marketing-consent"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    рекламные сообщения GoStudy
                                </Link>{' '}
                                по электронной почте.
                                <small>
                                    Необязательно. Не применяется к детскому
                                    профилю.
                                </small>
                            </span>
                        </label>
                    </fieldset>

                    <button
                        type="submit"
                        disabled={
                            !arePlatformDocumentsAccepted
                            || !isPersonalDataAccepted
                            || isLoading
                        }
                    >
                        {isLoading
                            ? 'Регистрируем...'
                            : role === 'student'
                                ? 'Зарегистрироваться как ученик'
                                : role === 'teacher'
                                    ? 'Зарегистрироваться как учитель'
                                    : 'Зарегистрироваться как родитель'}
                    </button>
                </form>

                <p className="auth-card__note">
                    После регистрации проверьте почту и подтвердите email.
                </p>

                <p className="auth-card__bottom">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </section>
        </main>
    );
}
