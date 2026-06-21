import { Link } from 'react-router-dom';

import './Header.css';

export function Header() {
    return (
        <header className="site-header">
            <Link
                className="site-header__logo"
                to="/"
                aria-label="GoStudy — главная"
            >
                <img
                    src="/images/branding/logo-gostudy.svg"
                    alt="GoStudy"
                />
            </Link>

            <nav
                className="site-header__nav"
                aria-label="Навигация"
            >
                <Link
                    className="site-header__link"
                    to="/login"
                >
                    Войти
                </Link>

                <Link
                    className="site-header__pill"
                    to="/register"
                >
                    Регистрация
                </Link>
            </nav>
        </header>
    );
}