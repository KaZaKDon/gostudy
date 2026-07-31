import { STUDENT_TABS } from '../constants.js';
import { useTeacherStudentDetails } from '../useTeacherStudentDetails.js';

import { TeacherStudentTabContent } from './TeacherStudentTabContent.jsx';

function getStudentStatusLabel(status) {
    switch (status) {
        case 'active':
            return 'Активное обучение';

        case 'requests':
            return 'Заявка на обучение';

        case 'archive':
            return 'Архив';

        default:
            return 'Активное обучение';
    }
}

function TeacherStudentActions({
    student,
    status,
    actionStatus,
    onChangeStudentStatus,
    onAddLesson,
    onOpenMessage,
    onCreateHomework,
    onOpenJournal,
    onUpdateRelationStatus,
}) {
    if (status === 'requests') {
        return (
            <div className="teacher-students__profile-actions">
                <button
                    type="button"
                    disabled={actionStatus === 'loading'}
                    onClick={() => onChangeStudentStatus(student, 'active')}
                >
                    {actionStatus === 'loading'
                        ? 'Сохраняем...'
                        : 'Принять'}
                </button>

                <button
                    type="button"
                    className="teacher-students__danger"
                    disabled={actionStatus === 'loading'}
                    onClick={() => onChangeStudentStatus(student, 'archive')}
                >
                    Отклонить
                </button>
            </div>
        );
    }

    if (status === 'archive') {
        return (
            <div className="teacher-students__profile-actions">
                <button
                    type="button"
                    onClick={() => onOpenJournal(student)}
                >
                    История обучения
                </button>
                <button
                    type="button"
                    disabled={actionStatus === 'loading'}
                    onClick={() => onUpdateRelationStatus(
                        student,
                        'restore',
                    )}
                >
                    Возобновить обучение
                </button>
            </div>
        );
    }

    return (
        <div className="teacher-students__profile-actions">
            <button
                type="button"
                onClick={() => onOpenMessage(student)}
            >
                Написать
            </button>
            <button
                type="button"
                onClick={() => onAddLesson(student)}
            >
                Назначить урок
            </button>
            <button
                type="button"
                onClick={() => onCreateHomework(student)}
            >
                Домашнее задание
            </button>
            <button
                type="button"
                onClick={() => onOpenJournal(student)}
            >
                Журнал
            </button>
            <button
                type="button"
                className="teacher-students__danger"
                disabled={actionStatus === 'loading'}
                onClick={() => {
                    const confirmed = window.confirm(
                        'Завершить обучение? Ученик будет перемещён в архив.',
                    );

                    if (confirmed) {
                        onUpdateRelationStatus(student, 'archive');
                    }
                }}
            >
                Завершить обучение
            </button>
        </div>
    );
}

export function TeacherStudentProfile({
    student,
    activeTab,
    actionStatus,
    errorMessage,
    onTabChange,
    onChangeStudentStatus,
    onAddLesson,
    onOpenMessage,
    onCreateHomework,
    onOpenJournal,
    onUpdateRelationStatus,
}) {
    const studentStatus = student.status ?? 'active';
    const details = useTeacherStudentDetails(
        student.relationId,
        activeTab,
    );

    return (
        <article className="teacher-students__profile">
            <header className="teacher-students__profile-header">
                <div className="teacher-students__profile-title">
                    <span className="teacher-students__eyebrow">
                        Карточка ученика
                    </span>

                    <h2>{student.name}</h2>

                    <p>
                        {student.grade}
                        {' · '}
                        {student.subject}
                    </p>

                    <span className="teacher-students__status">
                        {getStudentStatusLabel(studentStatus)}
                    </span>
                </div>

                <TeacherStudentActions
                    student={student}
                    status={studentStatus}
                    actionStatus={actionStatus}
                    onChangeStudentStatus={onChangeStudentStatus}
                    onAddLesson={onAddLesson}
                    onOpenMessage={onOpenMessage}
                    onCreateHomework={onCreateHomework}
                    onOpenJournal={onOpenJournal}
                    onUpdateRelationStatus={onUpdateRelationStatus}
                />
            </header>

            {studentStatus !== 'requests' && (
                <nav
                    className="teacher-students__tabs"
                    aria-label="Разделы ученика"
                >
                    {STUDENT_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={
                                activeTab === tab.id
                                    ? 'teacher-students__tab teacher-students__tab--active'
                                    : 'teacher-students__tab'
                            }
                            onClick={() => onTabChange(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            )}

            <div className="teacher-students__content">
                {studentStatus !== 'requests' && errorMessage && (
                    <p className="teacher-students__action-error">
                        {errorMessage}
                    </p>
                )}

                {studentStatus === 'requests' ? (
                    <div className="teacher-students__request">
                        <h3>Заявка на обучение</h3>

                        <p>
                            Ученик хочет начать обучение по направлению:{' '}
                            <strong>{student.subject}</strong>.
                        </p>

                        <p>{student.summary?.goal}</p>

                        <p>
                            Формат:{' '}
                            <strong>{student.summary?.format}</strong>
                        </p>

                        <p>
                            Уровень:{' '}
                            <strong>{student.summary?.level}</strong>
                        </p>

                        {student.requestMessage && (
                            <p>
                                Сообщение ученика:{' '}
                                <strong>{student.requestMessage}</strong>
                            </p>
                        )}

                        {errorMessage && (
                            <p>{errorMessage}</p>
                        )}
                    </div>
                ) : (
                    <TeacherStudentTabContent
                        student={student}
                        activeTab={activeTab}
                        data={details.data}
                        status={details.status}
                        errorMessage={details.errorMessage}
                        onRetry={details.retry}
                    />
                )}
            </div>
        </article>
    );
}
