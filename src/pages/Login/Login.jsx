import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { API } from '../../api/api.js';
import { getRouteAfterLogin } from '../../utils/roleRoutes.js';

import './Login.css';

export function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (event) => {
        event.preventDefault();

        setErrorMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(API.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (result.status === 'email_not_verified') {
                    navigate(
                        `/verify-email?email=${encodeURIComponent(result.email || email)}`
                    );
                    return;
                }

                throw new Error(result.message || 'Ошибка входа');
            }

            const user = result.user;

            sessionStorage.setItem('gostudy_token', result.token);
            sessionStorage.setItem('gostudy_user', JSON.stringify(user));

            navigate(getRouteAfterLogin(user));
            
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось выполнить вход'
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

                <h1>Вход</h1>

                <form className="auth-card__form" onSubmit={handleLogin}>
                    <label>
                        <span>Почта</span>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="example@mail.ru"
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label>
                        <span>Пароль</span>

                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Введите пароль"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {errorMessage && (
                        <p className="auth-card__error">
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Входим...' : 'Войти'}
                    </button>
                </form>

                <Link className="auth-card__forgot" to="/password-reset">
                    Забыли пароль?
                </Link>

                <p className="auth-card__bottom">
                    Нет аккаунта?{' '}
                    <Link to="/register">
                        Зарегистрироваться
                    </Link>
                </p>
            </section>
        </main>
    );
}