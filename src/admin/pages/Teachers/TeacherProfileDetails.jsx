import {
    formatAdminDate,
    formatAdminPrice,
    renderAdminValue,
    teacherStatusLabels,
    verificationLabels,
} from './teacherPresentation.js';

function DetailList({ children }) {
    return <dl className="teacher-view__list">{children}</dl>;
}

function Detail({ label, children }) {
    return (
        <div>
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}

function TextBlock({ title, value }) {
    if (!value) {
        return null;
    }

    return (
        <div className="teacher-view__text-block">
            <strong>{title}</strong>
            <p className="teacher-view__text">{value}</p>
        </div>
    );
}

export function TeacherProfileDetails({ teacherData }) {
    const teacher = teacherData.teacher;
    const stats = teacherData.stats || {};
    const subjects = teacherData.subjects || [];
    const preparations = teacherData.subject_preparations || [];
    const ageGroups = teacherData.age_groups || [];
    const education = teacherData.education || [];
    const documents = teacherData.documents || [];
    const students = teacherData.students || [];

    return (
        <>
            <div className="teacher-view__stats">
                <div>
                    <span>Активные ученики</span>
                    <strong>{stats.active_students_total ?? 0}</strong>
                </div>
                <div>
                    <span>Уроки</span>
                    <strong>{stats.lessons_total ?? 0}</strong>
                </div>
                <div>
                    <span>Домашние задания</span>
                    <strong>{stats.homework_total ?? 0}</strong>
                </div>
                <div>
                    <span>Документы</span>
                    <strong>{stats.documents_total ?? 0}</strong>
                </div>
                <div>
                    <span>На проверке</span>
                    <strong>{stats.pending_documents_total ?? 0}</strong>
                </div>
            </div>

            <section className="teacher-view__section">
                <h4>Аккаунт</h4>
                <DetailList>
                    <Detail label="ID">{teacher.id}</Detail>
                    <Detail label="ФИО">
                        {renderAdminValue(teacher.full_name)}
                    </Detail>
                    <Detail label="Email">
                        {renderAdminValue(teacher.email)}
                    </Detail>
                    <Detail label="Телефон">
                        {renderAdminValue(teacher.phone)}
                    </Detail>
                    <Detail label="Статус">
                        {teacherStatusLabels[teacher.status]
                            || renderAdminValue(teacher.status)}
                    </Detail>
                    <Detail label="Дата регистрации">
                        {formatAdminDate(teacher.created_at)}
                    </Detail>
                    <Detail label="Последний вход">
                        {formatAdminDate(teacher.last_login_at)}
                    </Detail>
                </DetailList>
            </section>

            <section className="teacher-view__section">
                <h4>Анкета</h4>
                <DetailList>
                    <Detail label="ID профиля">
                        {renderAdminValue(teacher.profile_id)}
                    </Detail>
                    <Detail label="Город">
                        {renderAdminValue(teacher.city)}
                    </Detail>
                    <Detail label="Часовой пояс">
                        {renderAdminValue(teacher.timezone)}
                    </Detail>
                    <Detail label="Заголовок">
                        {renderAdminValue(teacher.headline)}
                    </Detail>
                    <Detail label="Опыт">
                        {teacher.experience_years === null
                            ? '—'
                            : `${teacher.experience_years} лет`}
                    </Detail>
                    <Detail label="45 минут">
                        {formatAdminPrice(teacher.price_45)}
                    </Detail>
                    <Detail label="60 минут">
                        {formatAdminPrice(teacher.price_60)}
                    </Detail>
                    <Detail label="90 минут">
                        {formatAdminPrice(teacher.price_90)}
                    </Detail>
                    <Detail label="Проверка">
                        {verificationLabels[teacher.verification_status]
                            || renderAdminValue(teacher.verification_status)}
                    </Detail>
                    <Detail label="Видимость">
                        {teacher.is_visible ? 'Показывается' : 'Скрыта'}
                    </Detail>
                    <Detail label="Заполненность">
                        {teacher.profile_completion === null
                            ? '—'
                            : `${teacher.profile_completion}%`}
                    </Detail>
                    <Detail label="Проверил">
                        {renderAdminValue(teacher.verified_by_name)}
                    </Detail>
                    <Detail label="Дата проверки">
                        {formatAdminDate(teacher.verified_at)}
                    </Detail>
                    <Detail label="Комментарий модератора">
                        {renderAdminValue(teacher.verification_comment)}
                    </Detail>
                </DetailList>

                <TextBlock title="О себе" value={teacher.about} />
                <TextBlock title="Методика" value={teacher.teaching_method} />
                <TextBlock
                    title="Первый урок"
                    value={teacher.first_lesson_description}
                />
                <TextBlock
                    title="Что получает ученик"
                    value={teacher.student_gets}
                />
                <TextBlock
                    title="Расписание"
                    value={teacher.schedule_description}
                />
            </section>

            <section className="teacher-view__section">
                <h4>Предметы и ученики</h4>
                <div className="teacher-view__tags">
                    {subjects.length > 0
                        ? subjects.map((subject) => (
                            <span key={subject.id}>{subject.name}</span>
                        ))
                        : <span>Предметы не выбраны</span>}
                </div>

                {preparations.length > 0 && (
                    <div className="teacher-view__cards">
                        {preparations.map((item) => (
                            <article
                                className="teacher-view__card"
                                key={`${item.subject_id}:${item.preparation_id}`}
                            >
                                <strong>{item.subject_name}</strong>
                                <span>{item.preparation_group_name}</span>
                                <small>{item.preparation_name}</small>
                            </article>
                        ))}
                    </div>
                )}

                <div className="teacher-view__tags">
                    {ageGroups.length > 0
                        ? ageGroups.map((group) => (
                            <span key={group.id}>{group.name}</span>
                        ))
                        : <span>Возрастные группы не выбраны</span>}
                </div>

                {students.length > 0 && (
                    <div className="teacher-view__cards">
                        {students.map((student) => (
                            <article className="teacher-view__card" key={student.id}>
                                <strong>{student.full_name || student.email}</strong>
                                <span>{student.subject_name}</span>
                                <small>
                                    {student.status === 'active'
                                        ? 'Активный ученик'
                                        : 'В архиве'}
                                </small>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="teacher-view__section">
                <h4>Образование</h4>
                {education.length === 0 ? (
                    <p className="teacher-view__muted">Не заполнено.</p>
                ) : (
                    <div className="teacher-view__cards">
                        {education.map((item) => (
                            <article className="teacher-view__card" key={item.id}>
                                <strong>{item.institution}</strong>
                                <span>
                                    {[item.faculty, item.speciality]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                </span>
                                <small>
                                    {[item.qualification, item.graduation_year]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                </small>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="teacher-view__section">
                <h4>Документы</h4>
                {documents.length === 0 ? (
                    <p className="teacher-view__muted">Не загружены.</p>
                ) : (
                    <div className="teacher-view__cards">
                        {documents.map((document) => (
                            <article className="teacher-view__card" key={document.id}>
                                <strong>{document.document_title}</strong>
                                <span>{document.original_name}</span>
                                <small>
                                    {document.status === 'approved'
                                        ? 'Подтверждён'
                                        : document.status === 'rejected'
                                            ? `Отклонён${document.reject_reason ? `: ${document.reject_reason}` : ''}`
                                            : 'На проверке'}
                                </small>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
