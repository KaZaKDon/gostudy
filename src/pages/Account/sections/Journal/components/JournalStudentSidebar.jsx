import { useState } from 'react';

export function JournalStudentSidebar({
    courses,
    activeCourseId,
    onSelectCourse,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const activeCourse = courses.find(
        (course) => course.id === activeCourseId,
    ) ?? courses[0];

    const handleSelectCourse = (courseId) => {
        onSelectCourse(courseId);
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
                <span>Ученик и предмет</span>
                <strong>{activeCourse?.studentName}</strong>
            </button>

            <div className="journal-students__list">
                {courses.map((course) => (
                    <button
                        key={course.id}
                        type="button"
                        className={
                            activeCourseId === course.id
                                ? 'journal-students__button journal-students__button--active'
                                : 'journal-students__button'
                        }
                        onClick={() => handleSelectCourse(course.id)}
                    >
                        <strong>{course.studentName}</strong>
                        <span>
                            {course.subjectName}
                            {course.classLevel
                                ? ` · ${course.classLevel}`
                                : ''}
                        </span>
                        {course.pendingResultsCount > 0 && (
                            <em>
                                Не заполнено: {course.pendingResultsCount}
                            </em>
                        )}
                    </button>
                ))}
            </div>
        </aside>
    );
}
