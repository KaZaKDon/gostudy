import { useState } from 'react';

export function DiarySubjectSidebar({
    subjects,
    activeSubjectId,
    onSelectSubject,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const activeSubject = subjects.find(
        (subject) => subject.id === activeSubjectId,
    ) ?? subjects[0];

    const handleSelectSubject = (subjectId) => {
        onSelectSubject(subjectId);
        setIsOpen(false);
    };

    return (
        <aside
            className={
                isOpen
                    ? 'diary-subjects diary-subjects--open'
                    : 'diary-subjects'
            }
        >
            <button
                type="button"
                className="diary-subjects__toggle"
                onClick={() => setIsOpen((value) => !value)}
            >
                <span>Предмет</span>
                <strong>{activeSubject?.name}</strong>
            </button>

            <div className="diary-subjects__list">
                {subjects.map((subject) => (
                    <button
                        key={subject.id}
                        type="button"
                        className={
                            activeSubjectId === subject.id
                                ? 'diary-subjects__button diary-subjects__button--active'
                                : 'diary-subjects__button'
                        }
                        onClick={() => handleSelectSubject(subject.id)}
                    >
                        <strong>{subject.name}</strong>
                        <span>
                            {subject.averageGrade
                                ? `Средний балл: ${subject.averageGrade}`
                                : 'Без оценок'}
                        </span>
                    </button>
                ))}
            </div>
        </aside>
    );
}
