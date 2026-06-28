import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../../styles/admin.css';

export function AdminLoginPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/admin/auth/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.message || 'Ошибка входа');
                return;
            }

            navigate('/admin/dashboard', {
                replace: true,
            });
        } catch {
            setError('Не удалось подключиться к серверу');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="admin-login">
            <form className="admin-login__card" onSubmit={handleSubmit}>
                <div className="admin-login__header">
                    <span className="admin-login__label">GoStudy</span>
                    <h1 className="admin-login__title">Вход в админку</h1>
                    <p className="admin-login__text">
                        Доступ только для администратора или модератора.
                    </p>
                </div>

                <label className="admin-login__field">
                    <span>Email</span>
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                    />
                </label>

                <label className="admin-login__field">
                    <span>Пароль</span>
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                        required
                    />
                </label>

                {error && (
                    <p className="admin-login__error">
                        {error}
                    </p>
                )}

                <button
                    className="admin-login__button"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? 'Входим...' : 'Войти'}
                </button>
            </form>
        </main>
    );
}