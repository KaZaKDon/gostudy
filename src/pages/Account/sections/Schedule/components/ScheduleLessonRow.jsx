import {
    canEnterLesson,
    canRequestLessonChange,
    getClassButtonLabel,
} from '../../../utils/schedule.js';

export function ScheduleLessonRow({
    role,
    lesson,
    onEnterClass,
    onOpenChange,
    currentTime,
}) {
    const personName =
        role === 'teacher'
            ? lesson.studentName
            : lesson.teacherName;

    const classButtonText = getClassButtonLabel(
        lesson,
        role,
        currentTime,
    );

    const isClassAvailable = canEnterLesson(lesson, currentTime);
    const canChangeLesson = canRequestLessonChange(lesson);
    const changeRequest = lesson.changeRequest;
    const lastChange = lesson.lastChange;

    return (
        <article className="schedule-lesson-wrap">
            <div className="schedule-lesson">
                <span className="schedule-lesson__time">
                    {lesson.time}
                </span>

                <span className="schedule-lesson__person">
                    {personName}
                </span>

                <span className="schedule-lesson__info">
                    {lesson.subject}
                    {' · '}
                    {lesson.topic}
                    <small>{lesson.statusLabel}</small>
                </span>

                <span className="schedule-lesson__duration">
                    {lesson.duration}
                </span>

                <div className="schedule-lesson__actions">
                    <button
                        type="button"
                        className="schedule-lesson__action schedule-lesson__action--primary"
                        disabled={!isClassAvailable}
                        onClick={() => onEnterClass(lesson)}
                    >
                        {classButtonText}
                    </button>

                    {canChangeLesson && (
                        <>
                            <button
                                type="button"
                                className="schedule-lesson__action"
                                onClick={() =>
                                    onOpenChange(lesson, 'reschedule')
                                }
                            >
                                Предложить перенос
                            </button>

                            <button
                                type="button"
                                className="schedule-lesson__action schedule-lesson__action--danger"
                                onClick={() =>
                                    onOpenChange(lesson, 'cancel')
                                }
                            >
                                Предложить отмену
                            </button>
                        </>
                    )}

                    {changeRequest?.canRespond && (
                        <button
                            type="button"
                            className="schedule-lesson__action"
                            onClick={() =>
                                onOpenChange(lesson, 'review')
                            }
                        >
                            Рассмотреть
                        </button>
                    )}

                    {changeRequest?.canWithdraw && (
                        <button
                            type="button"
                            className="schedule-lesson__action schedule-lesson__action--danger"
                            onClick={() =>
                                onOpenChange(lesson, 'withdraw')
                            }
                        >
                            Отозвать
                        </button>
                    )}
                </div>
            </div>

            {changeRequest && (
                <div className="schedule-lesson__request">
                    <strong>
                        {changeRequest.canRespond
                            ? `${changeRequest.requesterName} предлагает ${
                                changeRequest.type === 'reschedule'
                                    ? 'перенести урок'
                                    : 'отменить урок'
                            }`
                            : 'Ваше предложение ожидает ответа'}
                    </strong>

                    {changeRequest.proposedDateTimeLabel && (
                        <span>
                            Новое время: {changeRequest.proposedDateTimeLabel}
                        </span>
                    )}

                    <span>Причина: {changeRequest.comment}</span>
                </div>
            )}

            {!changeRequest && lastChange && (
                <div className="schedule-lesson__request schedule-lesson__request--history">
                    <strong>
                        {lastChange.status === 'approved'
                            ? lastChange.type === 'reschedule'
                                ? 'Перенос согласован обеими сторонами'
                                : 'Отмена согласована обеими сторонами'
                            : lastChange.status === 'rejected'
                                ? 'Предложение отклонено'
                                : 'Предложение отозвано'}
                    </strong>

                    {lastChange.responseComment && (
                        <span>
                            Ответ: {lastChange.responseComment}
                        </span>
                    )}
                </div>
            )}
        </article>
    );
}
