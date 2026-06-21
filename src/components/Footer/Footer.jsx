import './Footer.css';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer__container">
                <div className="footer__left">
                    <span>
                        © {currentYear} GoStudy / «Пошли учиться»
                    </span>
                </div>

                <div className="footer__center">
                    <span>
                        Онлайн-платформа для учеников и преподавателей
                    </span>
                </div>

                <div className="footer__right">
                    <span>
                        VKazakDon Studio
                    </span>
                </div>
            </div>
        </footer>
    );
}