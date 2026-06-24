import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PasswordField } from '../../components/PasswordField/PasswordField.jsx';

import './Register.css';

export function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialRole = searchParams.get('role') === 'teacher'
        ? 'teacher'
        : 'student';

    const [role, setRole] = useState(initialRole);
    const [isAgreementAccepted, setIsAgreementAccepted] = useState(false);

    const handleRegister = () => {
        if (!isAgreementAccepted) {
            return;
        }

        navigate(`/profile-start?role=${role}`);
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
                        autoComplete="new-password"
                    />

                    <PasswordField
                        label="Повторите пароль"
                        placeholder="Повторите пароль"
                        autoComplete="new-password"
                    />

                    <label className="auth-card__agreement">
                        <input
                            type="checkbox"
                            checked={isAgreementAccepted}
                            onChange={(event) =>
                                setIsAgreementAccepted(event.target.checked)
                            }
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
                        type="button"
                        disabled={!isAgreementAccepted}
                        onClick={handleRegister}
                    >
                        {role === 'student'
                            ? 'Зарегистрироваться как ученик'
                            : 'Зарегистрироваться как учитель'}
                    </button>
                </form>

                <p className="auth-card__note">
                    После регистрации откроется анкета пользователя.
                    Пока раздел находится в разработке.
                </p>

                <p className="auth-card__bottom">
                    Уже есть аккаунт?{' '}
                    <Link to="/login">
                        Войти
                    </Link>
                </p>
            </section>
        </main>
    );
}