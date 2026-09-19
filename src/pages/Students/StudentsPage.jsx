import {
    BookOpenCheck,
    CalendarDays,
    ChartNoAxesCombined,
    CircleCheckBig,
    MessageCircleMore,
    MonitorPlay,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Footer } from '../../components/Footer/Footer.jsx';
import { Header } from '../../components/Header/Header.jsx';

import './StudentsPage.css';

const STUDENT_TOOLS = [
    {
        icon: Search,
        title: 'Поиск преподавателя',
        text: 'Выбирайте по предмету, опыту, отзывам, формату работы и стоимости занятий.',
    },
    {
        icon: CalendarDays,
        title: 'Понятное расписание',
        text: 'Все запланированные уроки и запросы на изменение времени находятся в одном месте.',
    },
    {
        icon: MonitorPlay,
        title: 'Онлайн-класс',
        text: 'Подключайтесь к занятию, общайтесь с преподавателем и работайте с учебными материалами.',
    },
    {
        icon: BookOpenCheck,
        title: 'Домашние задания',
        text: 'Получайте задания, прикрепляйте выполненную работу и сохраняйте результаты обучения.',
    },
    {
        icon: MessageCircleMore,
        title: 'Переписка без потерь',
        text: 'Договорённости, сообщения и вложения остаются рядом с учебным процессом.',
    },
    {
        icon: ChartNoAxesCombined,
        title: 'Дневник и прогресс',
        text: 'Следите за занятиями, выполненными заданиями и движением к своей цели.',
    },
];

const START_STEPS = [
    {
        title: 'Создайте аккаунт',
        text: 'Совершеннолетний ученик регистрируется самостоятельно. Для ребёнка младше 18 лет аккаунт сначала создаёт родитель.',
    },
    {
        title: 'Найдите преподавателя',
        text: 'Выберите предмет, изучите анкету специалиста и обсудите цель, формат и расписание.',
    },
    {
        title: 'Начните заниматься',
        text: 'Уроки, сообщения, домашние задания и результаты будут собраны в личном кабинете.',
    },
];

export function StudentsPage() {
    return (
        <main className="students-page">
            <Header />

            <div className="students-page__content">
                <Link className="students-page__back" to="/">
                    ← На главную
                </Link>

                <article
                    className="student-notebook"
                    aria-labelledby="students-title"
                >
                    <section className="student-notebook__page student-notebook__page--cover">
                        <div className="student-notebook__label">
                            <span>GoStudy</span>
                            <strong>Тетрадь ученика</strong>
                        </div>

                        <p className="student-notebook__eyebrow">
                            Учиться спокойно и последовательно
                        </p>

                        <h1 id="students-title">Ученикам</h1>

                        <p className="student-notebook__lead">
                            Преподаватель, расписание, занятия, задания
                            и результаты — в одном образовательном пространстве.
                        </p>

                        <div className="student-notebook__tags" aria-label="Возможности">
                            <span>Онлайн-занятия</span>
                            <span>Домашние задания</span>
                            <span>Связь с преподавателем</span>
                        </div>
                    </section>

                    <section className="student-notebook__page student-notebook__page--plan">
                        <p className="student-notebook__date">Мой учебный план</p>
                        <h2>Путь от поиска до результата</h2>

                        <ul className="student-notebook__checklist">
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Найти преподавателя по нужному предмету.</span>
                            </li>
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Согласовать цель, стоимость и удобное время.</span>
                            </li>
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Заниматься и выполнять задания в GoStudy.</span>
                            </li>
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Видеть историю уроков и свои результаты.</span>
                            </li>
                        </ul>

                        <div className="student-notebook__actions">
                            <Link
                                className="student-notebook__primary"
                                to="/register?role=student"
                            >
                                Стать учеником
                            </Link>
                            <Link
                                className="student-notebook__secondary"
                                to="/login"
                            >
                                У меня уже есть аккаунт
                            </Link>
                        </div>
                    </section>
                </article>

                <section
                    className="students-tools"
                    aria-labelledby="students-tools-title"
                >
                    <div className="students-section-heading">
                        <p>Учебное пространство</p>
                        <h2 id="students-tools-title">
                            Всё необходимое рядом
                        </h2>
                        <span>
                            Не нужно искать расписание в одном чате,
                            задание — в другом, а нужный файл — среди старых сообщений.
                        </span>
                    </div>

                    <div className="students-tools__grid">
                        {STUDENT_TOOLS.map((tool, index) => {
                            const Icon = tool.icon;

                            return (
                                <article className="students-tool" key={tool.title}>
                                    <div className="students-tool__icon">
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <span className="students-tool__number" aria-hidden="true">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3>{tool.title}</h3>
                                    <p>{tool.text}</p>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section
                    className="students-parent-note"
                    aria-labelledby="students-parent-title"
                >
                    <div className="students-parent-note__icon">
                        <ShieldCheck aria-hidden="true" />
                    </div>

                    <div className="students-parent-note__intro">
                        <p>Для семей с детьми</p>
                        <h2 id="students-parent-title">
                            Родитель остаётся в курсе
                        </h2>
                        <span>
                            Если ученику ещё нет 18 лет, сначала регистрируется
                            родитель, а затем добавляет профиль ребёнка.
                        </span>
                    </div>

                    <div className="students-parent-note__details">
                        <div>
                            <strong>Что видит родитель</strong>
                            <p>
                                Расписание, домашние задания, результаты ребёнка
                                и переписку с преподавателем в режиме просмотра.
                            </p>
                        </div>
                        <div>
                            <strong>Зачем это нужно</strong>
                            <p>
                                Чтобы помогать ребёнку и понимать ход обучения,
                                не нарушая его рабочее общение с преподавателем.
                            </p>
                        </div>
                        <Link to="/register?role=parent">
                            Создать аккаунт родителя →
                        </Link>
                    </div>
                </section>

                <section
                    className="students-start"
                    aria-labelledby="students-start-title"
                >
                    <div className="students-section-heading students-section-heading--center">
                        <p>Три шага</p>
                        <h2 id="students-start-title">Как начать</h2>
                    </div>

                    <ol className="students-start__steps">
                        {START_STEPS.map((step, index) => (
                            <li key={step.title}>
                                <span>{index + 1}</span>
                                <div>
                                    <h3>{step.title}</h3>
                                    <p>{step.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <p className="students-start__note">
                        Стоимость и формат занятий согласовываются с преподавателем.
                        GoStudy помогает организовать учебный процесс и сохранить
                        важные договорённости.
                    </p>

                    <Link
                        className="students-start__action"
                        to="/register?role=student"
                    >
                        Перейти к регистрации
                    </Link>
                </section>
            </div>

            <Footer />
        </main>
    );
}
