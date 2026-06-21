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
                Платформа, где обучение становится понятным,
                тёплым и организованным.
            </p>
        </section>
    );
}