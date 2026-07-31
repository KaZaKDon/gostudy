import {
    formatLearningDate,
    getAttendanceLabel,
    getGradeLabel,
} from '../../LearningResults/learningResults.js';

export function JournalRow({
    lesson,
    onOpenLesson,
}) {
    return (
        <button
            type="button"
            className={
                lesson.isPublished
                    ? 'journal-row'
                    : 'journal-row journal-row--pending'
            }
            onClick={() => onOpenLesson(lesson)}
        >
            <span className="journal-row__date">
                {formatLearningDate(lesson.lessonDate)}
            </span>
            <span className="journal-row__topic">{lesson.topic}</span>
            <span className="journal-row__attendance">
                {getAttendanceLabel(lesson.attendance)}
            </span>
            <span className="journal-row__homework">
                {lesson.homeworkCount > 0 ? 'Да' : 'Нет'}
            </span>
            <span className="journal-row__grade">
                {getGradeLabel(lesson.grade)}
            </span>
            <span className="journal-row__result-status">
                {lesson.isPublished ? 'Заполнено' : 'Заполнить'}
            </span>
        </button>
    );
}
