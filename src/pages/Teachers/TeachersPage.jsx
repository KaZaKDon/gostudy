import {
    BadgeCheck,
    BookOpen,
    CalendarDays,
    ChartNoAxesCombined,
    CircleCheckBig,
    ClipboardCheck,
    HandHeart,
    MessageCircleMore,
    MonitorPlay,
    Star,
    Users,
    WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Footer } from '../../components/Footer/Footer.jsx';
import { Header } from '../../components/Header/Header.jsx';

import './TeachersPage.css';

const TEACHER_TOOLS = [
    {
        icon: Users,
        title: 'Ученики и группы',
        text: 'Храните учебную информацию по каждому ученику и организуйте индивидуальную или групповую работу.',
    },
    {
        icon: CalendarDays,
        title: 'Расписание занятий',
        text: 'Планируйте уроки, согласовывайте изменения и держите рабочую неделю перед глазами.',
    },
    {
        icon: MonitorPlay,
        title: 'Онлайн-класс',
        text: 'Проводите занятия с видеосвязью, демонстрацией экрана и учебной доской.',
    },
    {
        icon: ClipboardCheck,
        title: 'Задания и результаты',
        text: 'Выдавайте домашнюю работу, принимайте ответы и фиксируйте результат занятия.',
    },
    {
        icon: MessageCircleMore,
        title: 'Рабочая переписка',
        text: 'Сообщения, файлы и договорённости с учеником остаются внутри учебного пространства.',
    },
    {
        icon: BookOpen,
        title: 'Материалы',
        text: 'Собирайте собственную библиотеку и готовьте материалы к размещению на платформе после модерации.',
    },
];

const START_STEPS = [
    {
        title: 'Зарегистрируйтесь',
        text: 'Создайте аккаунт преподавателя и подтвердите электронную почту.',
    },
    {
        title: 'Заполните анкету',
        text: 'Укажите предметы, опыт, формат работы, стоимость и сведения об образовании.',
    },
    {
        title: 'Настройте работу',
        text: 'Добавьте расписание, пригласите учеников и подготовьте материалы к занятиям.',
    },
    {
        title: 'Проводите уроки',
        text: 'Ведите занятия, выдавайте задания и сохраняйте результаты в одном кабинете.',
    },
];

export function TeachersPage() {
    return (
        <main className="teachers-page">
            <Header />

            <div className="teachers-page__content">
                <Link className="teachers-page__back" to="/">
                    ← На главную
                </Link>

                <article
                    className="teacher-journal"
                    aria-labelledby="teachers-title"
                >
                    <section className="teacher-journal__page teacher-journal__page--cover">
                        <div className="teacher-journal__stamp">
                            <span>GoStudy</span>
                            <strong>Классный журнал</strong>
                            <small>Рабочее пространство преподавателя</small>
                        </div>

                        <p className="teacher-journal__eyebrow">
                            Организуйте свою учебную практику
                        </p>

                        <h1 id="teachers-title">Учителям</h1>

                        <p className="teacher-journal__lead">
                            Ученики, расписание, занятия, материалы
                            и результаты — в единой понятной системе.
                        </p>

                        <div className="teacher-journal__tags" aria-label="Возможности">
                            <span>Своя методика</span>
                            <span>Своя стоимость</span>
                            <span>Своя рабочая неделя</span>
                        </div>
                    </section>

                    <section className="teacher-journal__page teacher-journal__page--week">
                        <p className="teacher-journal__caption">План преподавателя</p>
                        <h2>Всё важное на своих местах</h2>

                        <ul className="teacher-journal__checklist">
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Создать профессиональную анкету.</span>
                            </li>
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Согласовать занятия и составить расписание.</span>
                            </li>
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Проводить уроки и выдавать задания.</span>
                            </li>
                            <li>
                                <CircleCheckBig aria-hidden="true" />
                                <span>Следить за результатами и расчётами.</span>
                            </li>
                        </ul>

                        <div className="teacher-journal__actions">
                            <Link
                                className="teacher-journal__primary"
                                to="/register?role=teacher"
                            >
                                Стать преподавателем
                            </Link>
                            <Link
                                className="teacher-journal__secondary"
                                to="/login"
                            >
                                Войти в кабинет
                            </Link>
                        </div>
                    </section>
                </article>

                <section
                    className="teachers-tools"
                    aria-labelledby="teachers-tools-title"
                >
                    <div className="teachers-section-heading">
                        <p>Рабочие инструменты</p>
                        <h2 id="teachers-tools-title">
                            Меньше организационной суеты
                        </h2>
                        <span>
                            GoStudy помогает собрать повседневную работу преподавателя
                            в одном месте, сохраняя свободу выбора методики и формата занятий.
                        </span>
                    </div>

                    <div className="teachers-tools__grid">
                        {TEACHER_TOOLS.map((tool, index) => {
                            const Icon = tool.icon;

                            return (
                                <article className="teachers-tool" key={tool.title}>
                                    <div className="teachers-tool__icon">
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <span className="teachers-tool__number" aria-hidden="true">
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
                    className="teachers-profile"
                    aria-labelledby="teachers-profile-title"
                >
                    <div className="teachers-profile__intro">
                        <div className="teachers-profile__icon">
                            <BadgeCheck aria-hidden="true" />
                        </div>
                        <p>Профессиональная анкета</p>
                        <h2 id="teachers-profile-title">
                            Покажите свой опыт и подход
                        </h2>
                        <span>
                            В подробной анкете ученик сможет заранее понять,
                            подходит ли ему преподаватель.
                        </span>
                    </div>

                    <div className="teachers-profile__list">
                        <div>
                            <Star aria-hidden="true" />
                            <span>
                                <strong>Отзывы и рейтинг</strong>
                                Формируются на основе реальной работы на платформе.
                            </span>
                        </div>
                        <div>
                            <ChartNoAxesCombined aria-hidden="true" />
                            <span>
                                <strong>Опыт и достижения</strong>
                                Помогают ученику увидеть сильные стороны специалиста.
                            </span>
                        </div>
                        <div>
                            <Users aria-hidden="true" />
                            <span>
                                <strong>Предметы и формат</strong>
                                Индивидуальные и групповые занятия по выбранным направлениям.
                            </span>
                        </div>
                    </div>
                </section>

                <section className="teachers-specials" aria-label="Дополнительные возможности">
                    <article className="teachers-specials__card teachers-specials__card--access">
                        <HandHeart aria-hidden="true" />
                        <p>Социальная программа</p>
                        <h2>Доступное образование</h2>
                        <span>
                            Преподаватель сможет добровольно выделить бесплатное
                            или льготное место и указать доступный формат помощи.
                        </span>
                        <strong>
                            Количество таких мест преподаватель определяет самостоятельно.
                        </strong>
                    </article>

                    <article className="teachers-specials__card teachers-specials__card--finance">
                        <WalletCards aria-hidden="true" />
                        <p>Финансовый учёт</p>
                        <h2>Расчёты без путаницы</h2>
                        <span>
                            В кабинете отображаются проведённые уроки, начисления,
                            удержания, ближайшая сумма к выплате и история переводов.
                        </span>
                        <strong>
                            Неоплаченные и спорные занятия показываются отдельно.
                        </strong>
                    </article>
                </section>

                <section
                    className="teachers-start"
                    aria-labelledby="teachers-start-title"
                >
                    <div className="teachers-section-heading teachers-section-heading--center">
                        <p>Начало работы</p>
                        <h2 id="teachers-start-title">Четыре понятных шага</h2>
                    </div>

                    <ol className="teachers-start__steps">
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

                    <p className="teachers-start__note">
                        Подробные условия работы, варианты тарифа и порядок расчётов
                        будут собраны на отдельной странице «Тарифы».
                    </p>

                    <Link
                        className="teachers-start__action"
                        to="/register?role=teacher"
                    >
                        Зарегистрироваться как преподаватель
                    </Link>
                </section>
            </div>

            <Footer />
        </main>
    );
}
