import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import './InfoModal.css';

export function InfoModal({ block, onClose }) {
    const [activeTab, setActiveTab] = useState(null);

    const hasTabs = Boolean(block?.tabs?.length);

    const currentTab = hasTabs
        ? block.tabs.find((tab) => tab.id === activeTab) ?? block.tabs[0]
        : null;

    const currentContent = currentTab ?? block;

    const title = currentTab?.title ?? block?.modalTitle ?? block?.title;
    const lead = currentContent?.modalLead ?? currentContent?.lead;

    const paragraphs = Array.isArray(currentContent?.modalText)
        ? currentContent.modalText
        : Array.isArray(currentContent?.text)
            ? currentContent.text
            : currentContent?.text
                ? [currentContent.text]
                : [];

    useEffect(() => {
        if (!block) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [block, onClose]);

    if (!block) {
        return null;
    }

    return (
        <div
            className="info-modal"
            onClick={onClose}
        >
            <div
                className="info-modal__card"
                style={{
                    '--modal-accent': block.accentColor ?? '#B8894D',
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    className="info-modal__close"
                    type="button"
                    aria-label="Закрыть окно"
                    onClick={onClose}
                >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            d="M6 6L18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />

                        <path
                            d="M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>

                <h2>{block.modalTitle ?? block.title}</h2>

                {hasTabs && (
                    <div className="info-modal__tabs">
                        {block.tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={
                                    tab.id === currentContent.id
                                        ? 'info-modal__tab info-modal__tab--active'
                                        : 'info-modal__tab'
                                }
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.title}
                            </button>
                        ))}
                    </div>
                )}

                {hasTabs && (
                    <h3 className="info-modal__subtitle">
                        {title}
                    </h3>
                )}

                {lead && (
                    <p className="info-modal__lead">
                        {lead}
                    </p>
                )}

                {paragraphs.length > 0 && (
                    <div className="info-modal__content">
                        {paragraphs.map((paragraph) => (
                            <p key={paragraph}>
                                {paragraph}
                            </p>
                        ))}
                    </div>
                )}

                {block.actionText && (
                    <Link
                        className="info-modal__action"
                        to={`/register?role=${block.id === 'teachers' ? 'teacher' : 'student'}`}
                    >
                        {block.actionText}
                    </Link>
                )}
            </div>
        </div>
    );
}