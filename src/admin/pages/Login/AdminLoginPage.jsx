import { useState } from 'react';
import {
    Navigate,
    useNavigate,
} from 'react-router-dom';

import { PasswordField } from '../../../components/PasswordField/PasswordField.jsx';
import { useAdminAuth } from '../../auth/useAdminAuth.js';

import '../../styles/admin.css';

export function AdminLoginPage() {
    const navigate = useNavigate();
    const {
        login,
        status,
    } = useAdminAuth();

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
            await login(form);

            navigate('/admin/dashboard', {
                replace: true,
            });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Не удалось подключиться к серверу',
            );
        } finally {
            setIsLoading(false);
        }
    }

    if (status === 'authenticated') {
        return <Navigate to="/admin/dashboard" replace />;
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

                <PasswordField
                    labelClassName="admin-login__field"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                />

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
