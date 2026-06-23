import { useState } from 'react';

import { getSubjectLabel } from '../utils.js';

export function MaterialsSubjectSidebar({
    subjects,
    activeSubject,
    onSelectSubject,
}) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelectSubject = (subject) => {
        onSelectSubject(subject);
        setIsOpen(false);
    };

    return (
        <aside
            className={
                isOpen
                    ? 'materials-subjects materials-subjects--open'
                    : 'materials-subjects'
            }
        >
            <button
                type="button"
                className="materials-subjects__toggle"
                onClick={() => setIsOpen((value) => !value)}
            >
                <span>Предмет</span>
                <strong>{getSubjectLabel(activeSubject)}</strong>
            </button>

            <div className="materials-subjects__list">
                {subjects.map((subject) => (
                    <button
                        key={subject}
                        type="button"
                        className={
                            activeSubject === subject
                                ? 'materials-subjects__button materials-subjects__button--active'
                                : 'materials-subjects__button'
                        }
                        onClick={() => handleSelectSubject(subject)}
                    >
                        {getSubjectLabel(subject)}
                    </button>
                ))}
            </div>
        </aside>
    );
}