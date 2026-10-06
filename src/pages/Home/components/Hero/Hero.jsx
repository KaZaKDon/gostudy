import './Hero.css';

export function Hero() {
    return (
        <section
            className="hero"
            aria-labelledby="home-title"
        >
            <h1 id="home-title">
                ПОШЛИ УЧИТЬСЯ
            </h1>

            <p>
                Найдите преподавателя, проводите онлайн-занятия,
                работайте с заданиями и сохраняйте результаты в одном месте.
            </p>
        </section>
    );
}
