import { Link, useSearchParams } from 'react-router-dom';

import { StudentProfileForm } from './StudentProfileForm.jsx';
import { TeacherProfileForm } from './TeacherProfileForm.jsx';

import './ProfileStart.css';

export function ProfileStart() {
    const [searchParams] = useSearchParams();

    const role =
        searchParams.get('role') === 'teacher'
            ? 'teacher'
            : 'student';

    const isTeacher = role === 'teacher';

    return (
        <main className="profile-start">
            <section
                className={
                    isTeacher
                        ? 'profile-start__card profile-start__card--teacher'
                        : 'profile-start__card profile-start__card--student'
                }
            >
                <Link className="profile-start__back" to="/">
                    ← На главную
                </Link>

                <header className="profile-start__header">
                    <span className="profile-start__eyebrow">
                        Добро пожаловать в GoStudy
                    </span>

                    <h1>
                        {isTeacher
                            ? 'Анкета преподавателя'
                            : 'Анкета ученика'}
                    </h1>

                    <p>
                        Тип аккаунта:{' '}
                        <strong>
                            {isTeacher ? 'Преподаватель' : 'Ученик'}
                        </strong>
                    </p>

                    <p>
                        {isTeacher
                            ? 'Заполните анкету. Расскажите о своём опыте, навыках и подходе к обучению — пусть ученики узнают Вас и оценят Ваши знания по достоинству.'
                            : 'Заполните анкету. Расскажите немного о себе и целях обучения — так преподавателю будет проще понять Ваши задачи.'}
                    </p>
                </header>

                {isTeacher ? <TeacherProfileForm /> : <StudentProfileForm />}
            </section>
        </main>
    );
}