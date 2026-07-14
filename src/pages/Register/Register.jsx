import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { API } from '../../api/api.js';

import './Register.css';

export function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialRole =
        searchParams.get('role') === 'teacher'
            ? 'teacher'
            : 'student';

    const [role, setRole] = useState(initialRole);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');

    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isPasswordRepeatVisible, setIsPasswordRepeatVisible] =
        useState(false);

    const [isAgreementAccepted, setIsAgreementAccepted] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRegister = async (event) => {
        event.preventDefault();

        setErrorMessage('');
        setSuccessMessage('');

        const normalizedEmail = email.trim().toLowerCase();

        if (!isAgreementAccepted) {
            setErrorMessage(
                'Необходимо принять пользовательское соглашение.',
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
                `/verify-email?email=${encodeURIComponent(normalizedEmail)}`,
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
                </div>

                <form
                    className="auth-card__form"
                    onSubmit={handleRegister}
                >
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

                    <label>
                        <span>Пароль</span>

                        <div className="auth-card__password-field">
                            <input
                                type={
                                    isPasswordVisible
                                        ? 'text'
                                        : 'password'
                                }
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Введите пароль"
                                autoComplete="new-password"
                                minLength={6}
                                disabled={isLoading}
                                required
                            />

                            <button
                                type="button"
                                className="auth-card__password-toggle"
                                aria-label={
                                    isPasswordVisible
                                        ? 'Скрыть пароль'
                                        : 'Показать пароль'
                                }
                                aria-pressed={isPasswordVisible}
                                onClick={() =>
                                    setIsPasswordVisible(
                                        (currentValue) => !currentValue,
                                    )
                                }
                            >
                                {isPasswordVisible ? 'Скрыть' : 'Показать'}
                            </button>
                        </div>
                    </label>

                    <label>
                        <span>Повторите пароль</span>

                        <div className="auth-card__password-field">
                            <input
                                type={
                                    isPasswordRepeatVisible
                                        ? 'text'
                                        : 'password'
                                }
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

                            <button
                                type="button"
                                className="auth-card__password-toggle"
                                aria-label={
                                    isPasswordRepeatVisible
                                        ? 'Скрыть повтор пароля'
                                        : 'Показать повтор пароля'
                                }
                                aria-pressed={isPasswordRepeatVisible}
                                onClick={() =>
                                    setIsPasswordRepeatVisible(
                                        (currentValue) => !currentValue,
                                    )
                                }
                            >
                                {isPasswordRepeatVisible
                                    ? 'Скрыть'
                                    : 'Показать'}
                            </button>
                        </div>
                    </label>

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

                    <label className="auth-card__agreement">
                        <input
                            type="checkbox"
                            checked={isAgreementAccepted}
                            onChange={(event) =>
                                setIsAgreementAccepted(
                                    event.target.checked,
                                )
                            }
                            disabled={isLoading}
                        />

                        <span>
                            Я принимаю{' '}
                            <Link to="/agreement">
                                пользовательское соглашение
                            </Link>
                            ,{' '}
                            <Link to="/privacy">
                                политику конфиденциальности
                            </Link>{' '}
                            и{' '}
                            <Link to="/rules">
                                правила платформы
                            </Link>
                            .
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={!isAgreementAccepted || isLoading}
                    >
                        {isLoading
                            ? 'Регистрируем...'
                            : role === 'student'
                                ? 'Зарегистрироваться как ученик'
                                : 'Зарегистрироваться как учитель'}
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