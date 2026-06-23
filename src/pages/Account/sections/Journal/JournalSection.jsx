import { useState } from 'react';

import {
    getFirstJournalStudent,
    getJournalStudentById,
} from './utils.js';

import { JournalStudentSidebar } from './components/JournalStudentSidebar.jsx';
import { JournalTable } from './components/JournalTable.jsx';
import { JournalLessonModal } from './components/JournalLessonModal.jsx';

import './JournalSection.css';

export function JournalSection({ journal = [] }) {
    const firstStudent = getFirstJournalStudent(journal);

    const [activeStudentId, setActiveStudentId] = useState(
        firstStudent?.id ?? null,
    );
    const [selectedLesson, setSelectedLesson] = useState(null);

    const activeStudent = getJournalStudentById(
        journal,
        activeStudentId,
    );

    return (
        <section className="journal-section">
            <header className="journal-section__header">
                <div>
                    <span>Журнал</span>
                    <h2>История занятий</h2>
                </div>
            </header>

            <div className="journal-section__layout">
                <JournalStudentSidebar
                    students={journal}
                    activeStudentId={activeStudent?.id}
                    onSelectStudent={setActiveStudentId}
                />

                <JournalTable
                    student={activeStudent}
                    onOpenLesson={setSelectedLesson}
                />
            </div>

            <JournalLessonModal
                lesson={selectedLesson}
                onClose={() => setSelectedLesson(null)}
            />
        </section>
    );
}