import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { Link, Navigate, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { getLegalDocument } from './legalDocuments.js';

import './LegalPage.css';

export function LegalPage({ documentType: legacyDocumentType }) {
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
            key={document.key}
        />
    );
}

function LegalDocumentView({ document }) {
    const [content, setContent] = useState('');
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
