import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { JournalStudentSidebar } from './components/JournalStudentSidebar.jsx';
import { JournalTable } from './components/JournalTable.jsx';
import { JournalLessonModal } from './components/JournalLessonModal.jsx';
import { useJournal } from './useJournal.js';

import './JournalSection.css';

export function JournalSection({
    targetLessonId = null,
    initialStudentId = null,
    initialSubjectId = null,
}) {
    const journal = useJournal(
        targetLessonId,
        initialStudentId,
        initialSubjectId,
    );
    const [selectedLesson, setSelectedLesson] = useState(null);
    const openedTargetRef = useRef(null);

    useEffect(() => {
        if (
            journal.targetLesson
            && openedTargetRef.current !== journal.targetLesson.id
        ) {
            openedTargetRef.current = journal.targetLesson.id;
            setSelectedLesson(journal.targetLesson);
        }
    }, [journal.targetLesson]);

    const handleSave = async (lessonId, formData) => {
        const saved = await journal.saveResult(lessonId, formData);

        if (saved) {
            setSelectedLesson(null);
        }
    };

    const handleOpenLesson = (lesson) => {
        journal.clearActionError();
        setSelectedLesson(lesson);
    };

    return (
        <section className="journal-section">
            <header className="journal-section__header">
                <div>
                    <span>Журнал</span>
                    <h2>История занятий</h2>
                </div>
            </header>

            {journal.status === 'loading' && !journal.courses.length ? (
                <div className="journal-table__empty">
                    Загружаем журнал...
                </div>
            ) : journal.status === 'error' && !journal.courses.length ? (
                <div className="journal-table__empty">
                    <p>{journal.errorMessage}</p>
                    <button type="button" onClick={journal.retry}>
                        Повторить
                    </button>
                </div>
            ) : !journal.courses.length ? (
                <div className="journal-table__empty">
                    <h3>В журнале пока нет уроков</h3>
                    <p>
                        Прошедшие занятия появятся здесь после окончания.
                    </p>
                </div>
            ) : (
                <div className="journal-section__layout">
                    <JournalStudentSidebar
                        courses={journal.courses}
                        activeCourseId={journal.activeCourse?.id}
                        onSelectCourse={journal.selectCourse}
                    />

                    <JournalTable
                        course={journal.activeCourse}
                        lessons={journal.lessons}
                        status={journal.status}
                        hasMore={journal.hasMore}
                        onLoadMore={journal.loadMore}
                        onOpenLesson={handleOpenLesson}
                    />
                </div>
            )}

            <JournalLessonModal
                key={selectedLesson?.id ?? 'closed'}
                lesson={selectedLesson}
                isSaving={journal.isSaving}
                errorMessage={journal.actionError}
                onSave={handleSave}
                onClose={() => setSelectedLesson(null)}
            />
        </section>
    );
}
