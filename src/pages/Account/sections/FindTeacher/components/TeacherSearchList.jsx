import { TeacherSearchRow } from './TeacherSearchRow.jsx';

export function TeacherSearchList({
    teachers,
    onOpenTeacher,
}) {
    if (!teachers.length) {
        return (
            <div className="teacher-search-list__empty">
                Преподаватели не найдены.
            </div>
        );
    }

    return (
        <div className="teacher-search-list">
            {teachers.map((teacher) => (
                <TeacherSearchRow
                    key={teacher.id}
                    teacher={teacher}
                    onOpenTeacher={onOpenTeacher}
                />
            ))}
        </div>
    );
}