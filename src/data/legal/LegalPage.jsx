import { Link, Navigate } from 'react-router-dom';

import { LEGAL_DOCUMENTS } from '../../data/legal/legalDocuments.js';

import './LegalPage.css';

export function LegalPage({ documentType }) {
    const document = LEGAL_DOCUMENTS[documentType];

    if (!document) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="legal-page">
            <article className="legal-card">
                <Link className="legal-card__back" to="/">
                    ← На главную
                </Link>

                <p className="legal-card__eyebrow">
                    {document.eyebrow}
                </p>

                <h1>
                    {document.title}
                </h1>

                <p className="legal-card__date">
                    {document.updatedAt}
                </p>

                <p className="legal-card__intro">
                    {document.intro}
                </p>

                <div className="legal-card__content">
                    {document.sections.map((section) => (
                        <section
                            className="legal-card__section"
                            key={section.title}
                        >
                            <h2>
                                {section.title}
                            </h2>

                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph}>
                                    {paragraph}
                                </p>
                            ))}
                        </section>
                    ))}
                </div>

                <div className="legal-card__notice">
                    <strong>Важно:</strong> текст используется как черновой
                    вариант для демо-версии GoStudy. Перед полноценным запуском
                    и подключением оплаты документ нужно юридически вычитать.
                </div>
            </article>
        </main>
    );
}