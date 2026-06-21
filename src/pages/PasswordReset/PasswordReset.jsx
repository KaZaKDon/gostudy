import { Link } from 'react-router-dom';

import './PasswordReset.css';

export function PasswordReset() {
    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link className="auth-card__back" to="/login">
                    ← Назад ко входу
                </Link>

                <h1>Восстановление пароля</h1>

                <p className="auth-card__note">
                    Введите почту, указанную при регистрации. Мы отправим ссылку
                    для восстановления доступа.
                </p>

                <form className="auth-card__form">
                    <label>
                        <span>Почта</span>

                        <input
                            type="email"
                            placeholder="example@mail.ru"
                            autoComplete="email"
                        />
                    </label>

                    <button type="button">
                        Отправить ссылку
                    </button>
                </form>
            </section>
        </main>
    );
}