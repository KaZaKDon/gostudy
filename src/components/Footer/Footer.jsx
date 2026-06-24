import { Link } from 'react-router-dom';

import { LEGAL_DOCUMENT_LINKS } from '../../data/legal/legalDocuments.js';

import './Footer.css';

export function Footer() {
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
                    aria-label="Документы платформы"
                >
                    {LEGAL_DOCUMENT_LINKS.map((link) => (
                        <Link
                            className="footer__link"
                            key={link.id}
                            to={link.path}
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
            </div>
        </footer>
    );
}