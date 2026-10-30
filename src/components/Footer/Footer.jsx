import { Link } from 'react-router-dom';

import { usePlatformIdentity } from '../../features/platform-identity/usePlatformIdentity.js';
import { PUBLIC_FOOTER_LINKS } from '../../data/publicFooterLinks.js';

import './Footer.css';

export function Footer() {
    const identity = usePlatformIdentity();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer__container">
                <div className="footer__brand">
                    <span>
                        © {currentYear} GoStudy / «Пошли учиться»
                    </span>

                    <span>
                        Онлайн-платформа для учеников и преподавателей
                    </span>

                </div>

                <nav
                    className="footer__links"
                    aria-label="Разделы и документы платформы"
                >
                    {PUBLIC_FOOTER_LINKS.map((link) => (
                        <Link
                            className="footer__link"
                            key={link.id}
                            to={link.to}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="footer__studio">
                    <a
                        className="footer__studio-link"
                        href="https://vkazakdon.ru/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        VKazakDon Studio
                    </a>
                </div>
                <div className="footer__identity">
                    <a
                        className="footer__contact-link"
                        href={identity.supportPhoneHref}
                    >
                        Телефон: {identity.supportPhone}
                    </a>

                        <span>{identity.legalName}</span>
                        <span>ИНН {identity.inn} · ОГРНИП {identity.ogrnip}</span>
                        <span>{identity.city}</span>
                        <a href={`mailto:${identity.supportEmail}`}>{identity.supportEmail}</a>

                </div>
            </div>
        </footer>
    );
}
