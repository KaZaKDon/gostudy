import { useState } from 'react';

export function JournalStudentSidebar({
    students,
    activeStudentId,
    onSelectStudent,
}) {
    const [isOpen, setIsOpen] = useState(false);

    const activeStudent =
        students.find(
            (student) => student.id === activeStudentId,
        ) ?? students[0];

    const handleSelectStudent = (studentId) => {
        onSelectStudent(studentId);
        setIsOpen(false);
    };

    return (
        <aside
            className={
                isOpen
                    ? 'journal-students journal-students--open'
                    : 'journal-students'
            }
        >
            <button
                type="button"
                className="journal-students__toggle"
                onClick={() => setIsOpen((value) => !value)}
            >
                <span>Ученик</span>

                <strong>
                    {activeStudent?.studentName}
                </strong>
            </button>

            <div className="journal-students__list">
                {students.map((student) => (
                    <button
                        key={student.id}
                        type="button"
                        className={
                            activeStudentId === student.id
                                ? 'journal-students__button journal-students__button--active'
                                : 'journal-students__button'
                        }
                        onClick={() =>
                            handleSelectStudent(
                                student.id,
                            )
                        }
                    >
                        <strong>
                            {student.studentName}
                        </strong>

                        <span>
                            {student.grade}
                        </span>
                    </button>
                ))}
            </div>
        </aside>
    );
}