import { Link } from 'react-router-dom';

import { Footer } from '../../components/Footer/Footer.jsx';
import { Header } from '../../components/Header/Header.jsx';

import './AboutPage.css';

const FEATURES = [
    {
        title: 'Всё для учёбы в одном месте',
        text: 'Расписание, занятия, домашние задания, материалы и общение собраны в едином пространстве.',
    },
    {
        title: 'Живое общение',
        text: 'Цифровые инструменты помогают учиться, но не заменяют личного контакта ученика и преподавателя.',
    },
    {
        title: 'Понятный контроль',
        text: 'Родители видят расписание, домашние задания и результаты ребёнка, не вмешиваясь в сам урок.',
    },
    {
        title: 'Свобода преподавания',
        text: 'Преподаватель сам выбирает методику, формат работы и организует свою учебную практику.',
    },
    {
        title: 'Безопасная среда',
        text: 'Правила платформы, модерация и механизмы обращений помогают бережно относиться к общению и данным.',
    },
    {
        title: 'Доступное образование',
        text: 'Преподаватели смогут выделять места для бесплатных или льготных занятий и помогать тем, кому это особенно нужно.',
    },
];

export function AboutPage() {
    return (
        <main className="about-page">
            <Header />

            <div className="about-page__content">
                <Link className="about-page__back" to="/">
                    ← На главную
                </Link>

                <article className="about-book" aria-labelledby="about-title">
                    <section className="about-book__page about-book__page--left">
                        <p className="about-book__eyebrow">
                            GoStudy · «Пошли учиться»
                        </p>

                        <h1 id="about-title">О платформе</h1>

                        <p className="about-book__lead">
                            Тёплое и понятное образовательное пространство
                            для учеников, родителей и преподавателей.
                        </p>

                        <p>
                            GoStudy помогает организовать обучение без хаоса:
                            найти преподавателя, договориться о занятиях,
                            вести расписание, хранить материалы и видеть прогресс.
                        </p>

                        <blockquote>
                            Технологии должны помогать обучению,
                            а не мешать живому общению.
                        </blockquote>
                    </section>

                    <section className="about-book__page about-book__page--right">
                        <h2>Для чего создана GoStudy</h2>

                        <p>
                            Обычно учебный процесс разбросан по разным
                            сервисам, чатам и файлам. Мы собираем его в одном
                            месте и сохраняем понятную связь между всеми участниками.
                        </p>

                        <div className="about-book__audiences">
                            <div>
                                <strong>Ученикам</strong>
                                <span>— учиться и видеть свой путь.</span>
                            </div>
                            <div>
                                <strong>Родителям</strong>
                                <span>— понимать, как идёт обучение.</span>
                            </div>
                            <div>
                                <strong>Преподавателям</strong>
                                <span>— организовать работу и развивать свою практику.</span>
                            </div>
                        </div>

                        <p className="about-book__note">
                            GoStudy развивается постепенно и с учётом опыта
                            тех, кто учит и учится.
                        </p>
                    </section>
                </article>

                <section className="about-section" aria-labelledby="about-features-title">
                    <div className="about-section__heading">
                        <p>Особенности</p>
                        <h2 id="about-features-title">Что важно для GoStudy</h2>
                    </div>

                    <div className="about-features">
                        {FEATURES.map((feature, index) => (
                            <article className="about-feature" key={feature.title}>
                                <span className="about-feature__number" aria-hidden="true">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <h3>{feature.title}</h3>
                                <p>{feature.text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-ecosystem" aria-labelledby="about-ecosystem-title">
                    <div className="about-ecosystem__studio">
                        <p className="about-ecosystem__eyebrow">
                            Экосистема цифровых проектов
                        </p>
                        <h2 id="about-ecosystem-title">
                            Проект VKazakDon Studio
                        </h2>
                        <p>
                            GoStudy разработана командой VKazakDon Studio.
                            Студия создаёт веб-платформы, цифровые сервисы
                            и собственные интернет-проекты, ориентированные
                            на реальные задачи людей.
                        </p>
                        <a
                            className="about-ecosystem__link"
                            href="https://vkazakdon.ru/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Перейти на сайт студии ↗
                        </a>
                    </div>

                    <div className="about-ecosystem__savar">
                        <div className="about-ecosystem__logo" aria-label="SAVAR">
                            <img
                                className="about-ecosystem__logo-light"
                                src="/images/branding/savar-logo-light-theme.webp"
                                width="279"
                                height="128"
                                alt="SAVAR"
                                loading="lazy"
                            />
                            <img
                                className="about-ecosystem__logo-dark"
                                src="/images/branding/savar-logo-dark-theme.webp"
                                width="520"
                                height="347"
                                alt=""
                                loading="lazy"
                            />
                        </div>
                        <h3>Цифровое направление SAVAR</h3>
                        <p>
                            SAVAR поддерживает технологическое и цифровое
                            развитие GoStudy: качество решений, аналитику
                            и устойчивое развитие продукта.
                        </p>
                    </div>
                </section>

                <section className="about-next" aria-labelledby="about-next-title">
                    <h2 id="about-next-title">GoStudy для ученика</h2>
                    <p>
                        Узнайте, как устроены поиск преподавателя,
                        занятия, домашние задания и родительский контроль.
                    </p>
                    <Link className="about-next__link" to="/students">
                        Перейти на страницу «Ученикам»
                    </Link>
                </section>
            </div>

            <Footer />
        </main>
    );
}
