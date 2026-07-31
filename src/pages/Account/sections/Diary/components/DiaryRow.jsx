import {
    formatLearningDate,
    getAttendanceLabel,
    getGradeLabel,
} from '../../LearningResults/learningResults.js';

export function DiaryRow({ lesson, onOpenLesson }) {
    return (
        <button
            type="button"
            className="diary-row"
            onClick={() => onOpenLesson(lesson)}
        >
            <span className="diary-row__date">
                {formatLearningDate(lesson.lessonDate)}
            </span>
            <span className="diary-row__topic">{lesson.topic}</span>
            <span className="diary-row__attendance">
                {getAttendanceLabel(lesson.attendance)}
            </span>
            <span className="diary-row__grade">
                {getGradeLabel(lesson.grade)}
            </span>
        </button>
    );
}
