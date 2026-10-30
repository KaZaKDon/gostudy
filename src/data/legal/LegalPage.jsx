import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { Link, Navigate, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { usePublicLightTheme } from '../../hooks/usePublicLightTheme.js';

import { getLegalDocument } from './legalDocuments.js';

import './LegalPage.css';

function readInitialLegalContent(metadata) {
    if (typeof window === 'undefined') return '';
    try {
        const element = window.document.getElementById('gostudy-legal-document');
        const initial = element ? JSON.parse(element.textContent) : null;
        return initial?.key === metadata.key && initial?.version === metadata.version
            && typeof initial.content === 'string' ? initial.content : '';
    } catch {
        return '';
    }
}

export function LegalPage({ documentType: legacyDocumentType, initialContent = '' }) {
    usePublicLightTheme();

    const { documentType: routeDocumentType } = useParams();
    const document = getLegalDocument(
        legacyDocumentType || routeDocumentType,
    );

    if (!document) {
        return <Navigate to="/404" replace />;
    }

    return (
        <LegalDocumentView
            document={document}
            initialContent={initialContent}
            key={document.key}
        />
    );
}

function LegalDocumentView({ document, initialContent }) {
    const [content, setContent] = useState(() => initialContent || readInitialLegalContent(document));
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let isActive = true;

        document.loadContent()
            .then((loadedContent) => {
                if (isActive) {
                    setContent(loadedContent);
                }
            })
            .catch(() => {
                if (isActive) {
                    setLoadError(true);
                }
            });

        return () => {
            isActive = false;
        };
    }, [document]);

    return (
        <main className="legal-page">
            <article className="legal-card">
                {content && (
                    <script
                        id="gostudy-legal-document"
                        type="application/json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify({
                            key: document.key, version: document.version, content,
                        }).replaceAll('<', '\\u003c') }}
                    />
                )}
                <Link className="legal-card__back" to="/">
                    ← На главную
                </Link>

                <p className="legal-card__eyebrow">
                    Документы GoStudy · редакция {document.version}
                </p>

                {document.status === 'draft' && (
                    <div className="legal-card__notice" role="note">
                        <strong>Проект документа.</strong>{' '}
                        До коммерческого запуска требуется юридическая
                        проверка и заполнение реквизитов Оператора.
                    </div>
                )}

                <div className="legal-card__content">
                    {!content && !loadError && (
                        <p className="legal-card__state" role="status">
                            Загружаем документ…
                        </p>
                    )}

                    {loadError && (
                        <p className="legal-card__state" role="alert">
                            Не удалось загрузить документ. Обновите страницу
                            или напишите в support@gostudyonline.ru.
                        </p>
                    )}

                    {content && (
                        <Markdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </Markdown>
                    )}
                </div>
            </article>
        </main>
    );
}
