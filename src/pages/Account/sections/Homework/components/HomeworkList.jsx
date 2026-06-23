import { HomeworkRow } from './HomeworkRow.jsx';

export function HomeworkList({
    homework,
    onOpenHomework,
}) {
    if (!homework.length) {
        return (
            <div className="homework-list__empty">
                В этом статусе домашних работ нет.
            </div>
        );
    }

    return (
        <div className="homework-list">
            <div className="homework-list__head">
                <span>Ученик</span>
                <span>Задание</span>
                <span>Срок</span>
            </div>

            {homework.map((item) => (
                <HomeworkRow
                    key={item.id}
                    homework={item}
                    onOpen={onOpenHomework}
                />
            ))}
        </div>
    );
}