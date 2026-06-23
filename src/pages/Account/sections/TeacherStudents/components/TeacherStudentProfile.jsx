import { STUDENT_TABS } from '../constants.js';

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
    onChangeStudentStatus,
}) {
    if (status === 'requests') {
        return (
            <div className="teacher-students__profile-actions">
                <button type="button">
                    Написать
                </button>

                <button type="button">
                    Открыть анкету
                </button>

                <button
                    type="button"
                    onClick={() => onChangeStudentStatus(student.id, 'active')}
                >
                    Принять
                </button>

                <button
                    type="button"
                    className="teacher-students__danger"
                    onClick={() => onChangeStudentStatus(student.id, 'archive')}
                >
                    Отклонить
                </button>
            </div>
        );
    }

    if (status === 'archive') {
        return (
            <div className="teacher-students__profile-actions">
                <button type="button">История обучения</button>
                <button type="button">Возобновить обучение</button>
            </div>
        );
    }

    return (
        <div className="teacher-students__profile-actions">
            <button type="button">Написать</button>
            <button type="button">Назначить урок</button>
            <button type="button">Домашнее задание</button>
            <button type="button">Журнал</button>
            <button type="button" className="teacher-students__danger">
                Завершить обучение
            </button>
        </div>
    );
}

export function TeacherStudentProfile({
    student,
    activeTab,
    onTabChange,
    onChangeStudentStatus,
}) {
    const studentStatus = student.status ?? 'active';

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
                    onChangeStudentStatus={onChangeStudentStatus}
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
                    </div>
                ) : (
                    <TeacherStudentTabContent
                        student={student}
                        activeTab={activeTab}
                    />
                )}
            </div>
        </article>
    );
}