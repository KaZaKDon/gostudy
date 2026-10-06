import { Link } from 'react-router-dom';

import { Footer } from '../../components/Footer/Footer.jsx';
import { Header } from '../../components/Header/Header.jsx';

import './PublicInfo.css';

export function PublicInfoLayout({ eyebrow, title, lead, children }) {
    return (
        <main className="public-info-page">
            <Header />

            <div className="public-info-page__content">
                <Link className="public-info-page__back" to="/">
                    ← На главную
                </Link>

                <header className="public-info-page__heading">
                    <p>{eyebrow}</p>
                    <h1>{title}</h1>
                    <span>{lead}</span>
                </header>

                <div className="public-info-page__sections">
                    {children}
                </div>
            </div>

            <Footer />
        </main>
    );
}

export function PublicInfoSection({ icon: Icon, title, children, accent = false }) {
    return (
        <section className={`public-info-card${accent ? ' public-info-card--accent' : ''}`}>
            <div className="public-info-card__title">
                {Icon && <Icon aria-hidden="true" />}
                <h2>{title}</h2>
            </div>
            <div className="public-info-card__body">
                {children}
            </div>
        </section>
    );
}
