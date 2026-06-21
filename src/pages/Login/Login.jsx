import { Link, useNavigate } from 'react-router-dom';

import { PasswordField } from '../../components/PasswordField/PasswordField.jsx';

import './Login.css';

export function Login() {
    const navigate = useNavigate();

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link className="auth-card__back" to="/">
                    ← На главную
                </Link>

                <h1>Вход</h1>

                <form className="auth-card__form">
                    <label>
                        <span>Почта</span>

                        <input
                            type="email"
                            placeholder="example@mail.ru"
                            autoComplete="email"
                        />
                    </label>

                    <PasswordField
                        label="Пароль"
                        placeholder="Введите пароль"
                        autoComplete="current-password"
                    />

                    <button
                        type="button"
                        onClick={() => navigate('/account')}
                    >
                        Войти
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