import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import './SiteThemeToggle.css';

const STORAGE_KEY = 'gostudy-theme';

function getInitialTheme() {
    try {
        const savedTheme = localStorage.getItem(STORAGE_KEY);

        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
    } catch {
        // Use the light theme when storage is unavailable.
    }

    return 'light';
}

export function SiteThemeToggle() {
    const [theme, setTheme] = useState(getInitialTheme);
    const isDark = theme === 'dark';

    useEffect(() => {
        document.documentElement.dataset.theme = theme;

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // The selected theme still works for the current page.
        }
    }, [theme]);

    return (
        <button
            className="site-theme-toggle"
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
        >
            {isDark
                ? <Sun aria-hidden="true" size={20} strokeWidth={2.2} />
                : <Moon aria-hidden="true" size={20} strokeWidth={2.2} />}
        </button>
    );
}
