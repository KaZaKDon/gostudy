import { useState } from 'react';

import {
    getFirstDiarySubject,
    getDiarySubjectById,
} from './utils.js';

import { DiarySubjectSidebar } from './components/DiarySubjectSidebar.jsx';
import { DiaryStats } from './components/DiaryStats.jsx';
import { DiaryTable } from './components/DiaryTable.jsx';
import { DiaryLessonModal } from './components/DiaryLessonModal.jsx';

import './DiarySection.css';

export function DiarySection({
    diary = [],
}) {
    const firstSubject =
        getFirstDiarySubject(
            diary,
        );

    const [
        activeSubjectId,
        setActiveSubjectId,
    ] = useState(
        firstSubject?.id ?? null,
    );

    const [
        selectedLesson,
        setSelectedLesson,
    ] = useState(null);

    const activeSubject =
        getDiarySubjectById(
            diary,
            activeSubjectId,
        );

    return (
        <section className="diary-section">
            <header className="diary-section__header">
                <div>
                    <span>
                        Дневник обучения
                    </span>

                    <h2>
                        История занятий
                    </h2>
                </div>
            </header>

            <DiaryStats diary={diary} />

            <div className="diary-section__layout">
                <DiarySubjectSidebar
                    subjects={diary}
                    activeSubjectId={
                        activeSubject?.id
                    }
                    onSelectSubject={
                        setActiveSubjectId
                    }
                />

                <DiaryTable
                    subject={
                        activeSubject
                    }
                    onOpenLesson={
                        setSelectedLesson
                    }
                />
            </div>

            <DiaryLessonModal
                lesson={selectedLesson}
                onClose={() =>
                    setSelectedLesson(
                        null,
                    )
                }
            />
        </section>
    );
}