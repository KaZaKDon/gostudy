import { getStudentInitials } from '../utils.js';

export function TeacherStudentsSidebar({
    students,
    totalStudents,
    searchValue,
    selectedStudentId,
    onSearchChange,
    onSelectStudent,
}) {
    return (
        <aside className="teacher-students__sidebar">
            <div className="teacher-students__sidebar-header">
                <div>
                    <span className="teacher-students__eyebrow">
                        Ученики
                    </span>

                    <h2>{totalStudents}</h2>
                </div>

                <span className="teacher-students__counter">
                    {students.length}
                </span>
            </div>

            <label className="teacher-students__search">
                <span>Поиск ученика</span>

                <input
                    type="search"
                    value={searchValue}
                    placeholder="Имя, класс, предмет"
                    onChange={(event) =>
                        onSearchChange(event.target.value)
                    }
                />
            </label>

            <div className="teacher-students__list">
                {students.length > 0 ? (
                    students.map((student) => (
                        <button
                            key={student.id}
                            type="button"
                            className={
                                selectedStudentId === student.id
                                    ? 'teacher-student-card teacher-student-card--active'
                                    : 'teacher-student-card'
                            }
                            onClick={() =>
                                onSelectStudent(student.id)
                            }
                        >
                            <span className="teacher-student-card__avatar">
                                {getStudentInitials(student.name)}
                            </span>

                            <span className="teacher-student-card__content">
                                <strong>{student.name}</strong>

                                <small>
                                    {student.grade}
                                    {' · '}
                                    {student.subject}
                                </small>

                                <em>{student.nextLesson}</em>
                            </span>

                            <span
                                className={
                                    student.status === 'Активный'
                                        ? 'teacher-student-card__status teacher-student-card__status--active'
                                        : 'teacher-student-card__status'
                                }
                            >
                                {student.status}
                            </span>
                        </button>
                    ))
                ) : (
                    <p className="teacher-students__empty-search">
                        По такому запросу ученик не найден.
                    </p>
                )}
            </div>
        </aside>
    );
}