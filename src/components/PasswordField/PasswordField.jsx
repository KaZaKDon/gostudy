import { useState } from 'react';

import './PasswordField.css';

function EyeIcon({ opened }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M2 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 22 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            />

            <circle
                cx="12"
                cy="12"
                r="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            />

            {!opened && (
                <path
                    d="M4 20L20 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}

export function PasswordField({
    label = 'Пароль',
    placeholder = 'Введите пароль',
    autoComplete = 'current-password',
}) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <label>
            <span>{label}</span>

            <div className="password-field">
                <input
                    type={isVisible ? 'text' : 'password'}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                />

                <button
                    type="button"
                    className="password-field__toggle"
                    aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
                    onClick={() => setIsVisible((value) => !value)}
                >
                    <EyeIcon opened={isVisible} />
                </button>
            </div>
        </label>
    );
}