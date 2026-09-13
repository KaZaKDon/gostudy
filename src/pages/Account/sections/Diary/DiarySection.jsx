import { useState } from 'react';

import { DiarySubjectSidebar } from './components/DiarySubjectSidebar.jsx';
import { DiaryStats } from './components/DiaryStats.jsx';
import { DiaryTable } from './components/DiaryTable.jsx';
import { DiaryLessonModal } from './components/DiaryLessonModal.jsx';
import { useDiary } from './useDiary.js';

import './DiarySection.css';

export function DiarySection({
    role,
    targetLessonId,
    onOpenHomework,
}) {
    const diary = useDiary(role, targetLessonId);
    const isParent = role === 'parent';
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
                    <span>{isParent ? 'Семья' : 'Дневник обучения'}</span>
                    <h2>
                        {isParent ? 'Дневник детей' : 'История занятий'}
                    </h2>
                </div>
            </header>

            {isParent && diary.children.length > 0 && (
                <div className="diary-section__parent-controls">
                    <label>
                        <span>Ребёнок</span>

                        <select
                            value={diary.selectedStudentId || ''}
                            onChange={(event) => diary.selectParentStudent(
                                event.target.value,
                            )}
                        >
                            {diary.children.map((child) => (
                                <option
                                    key={child.student_id}
                                    value={child.student_id}
                                >
                                    {child.full_name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <p>
                        Только просмотр. Личная заметка преподавателя
                        родителю и ученику не показывается.
                    </p>
                </div>
            )}

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
                        {isParent
                            ? 'После публикации результатов здесь появятся темы, оценки и комментарии преподавателей.'
                            : 'После публикации результатов занятий здесь появятся темы, оценки и комментарии преподавателей.'}
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
                role={role}
                lesson={openLesson}
                onOpenHomework={onOpenHomework}
                onClose={handleCloseLesson}
            />
        </section>
    );
}
