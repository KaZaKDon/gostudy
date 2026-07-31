import { useState } from 'react';

import { DiarySubjectSidebar } from './components/DiarySubjectSidebar.jsx';
import { DiaryStats } from './components/DiaryStats.jsx';
import { DiaryTable } from './components/DiaryTable.jsx';
import { DiaryLessonModal } from './components/DiaryLessonModal.jsx';
import { useDiary } from './useDiary.js';

import './DiarySection.css';

export function DiarySection({
    targetLessonId,
    onOpenHomework,
}) {
    const diary = useDiary(targetLessonId);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [dismissedTargetId, setDismissedTargetId] = useState(null);
    const targetLesson = diary.targetLesson
        && diary.targetLesson.id !== dismissedTargetId
        ? diary.targetLesson
        : null;
    const openLesson = selectedLesson ?? targetLesson;

    const handleCloseLesson = () => {
        if (targetLesson) {
            setDismissedTargetId(targetLesson.id);
        }

        setSelectedLesson(null);
    };

    return (
        <section className="diary-section">
            <header className="diary-section__header">
                <div>
                    <span>Дневник обучения</span>
                    <h2>История занятий</h2>
                </div>
            </header>

            {diary.status === 'loading' && !diary.subjects.length ? (
                <div className="diary-table__empty">
                    Загружаем дневник...
                </div>
            ) : diary.status === 'error' && !diary.subjects.length ? (
                <div className="diary-table__empty">
                    <p>{diary.errorMessage}</p>
                    <button type="button" onClick={diary.retry}>
                        Повторить
                    </button>
                </div>
            ) : !diary.subjects.length ? (
                <div className="diary-table__empty">
                    <h3>В дневнике пока нет записей</h3>
                    <p>
                        После публикации результатов занятий здесь появятся
                        темы, оценки и комментарии преподавателей.
                    </p>
                </div>
            ) : (
                <>
                    <DiaryStats summary={diary.summary} />

                    <div className="diary-section__layout">
                        <DiarySubjectSidebar
                            subjects={diary.subjects}
                            activeSubjectId={diary.activeSubject?.id}
                            onSelectSubject={diary.selectSubject}
                        />

                        <DiaryTable
                            subject={diary.activeSubject}
                            lessons={diary.lessons}
                            status={diary.status}
                            hasMore={diary.hasMore}
                            onLoadMore={diary.loadMore}
                            onOpenLesson={setSelectedLesson}
                        />
                    </div>
                </>
            )}

            <DiaryLessonModal
                lesson={openLesson}
                onOpenHomework={onOpenHomework}
                onClose={handleCloseLesson}
            />
        </section>
    );
}
