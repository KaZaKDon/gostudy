import { Link } from 'react-router-dom';

import './NotFoundPage.css';

export function NotFoundPage() {
    return (
        <main className="not-found-page">
            <div className="not-found-page__content">
                <h1 className="not-found-page__title">Страница не найдена</h1>
                <Link className="not-found-page__button" to="/">
                    Вернуться на главную
                </Link>

                <Link
                    className="not-found-page__button not-found-page__button--secondary"
                    to="/login"
                >
                    Войти в кабинет
                </Link>
            </div>
        </main>
    );
}
