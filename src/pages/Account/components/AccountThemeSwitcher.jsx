import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gostudy-theme';

export function AccountThemeSwitcher() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) ?? 'light';
    });

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const isDark = theme === 'dark';

    return (
        <div className="account-theme">
            <span className="account-theme__label">
                Тема
            </span>

            <button
                type="button"
                className={isDark ? 'account-theme__toggle is-dark' : 'account-theme__toggle'}
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label="Переключить тему"
            >
                <span className="account-theme__knob" />
            </button>

            <span className="account-theme__value">
                {isDark ? 'Тёмная' : 'Светлая'}
            </span>
        </div>
    );
}