import { PromotedTeacherCard } from './PromotedTeacherCard.jsx';

const PROMOTED_TEACHERS_LIMIT = 3;

export function PromotedTeachersSection({
    teachers,
    onOpenTeacher,
}) {
    const promotedTeachers = teachers.slice(0, PROMOTED_TEACHERS_LIMIT);

    if (!promotedTeachers.length) return null;

    return (
        <section
            className="promoted-teachers"
            aria-labelledby="promoted-teachers-title"
        >
            <h3 id="promoted-teachers-title">ПРОДВИЖЕНИЕ</h3>

            <div className="promoted-teachers__list">
                {promotedTeachers.map((teacher) => (
                    <PromotedTeacherCard
                        key={teacher.id}
                        teacher={teacher}
                        onOpenTeacher={onOpenTeacher}
                    />
                ))}
            </div>
        </section>
    );
}
