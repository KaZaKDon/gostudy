import { useNavigate } from 'react-router-dom';

export function TeacherProfileForm() {
    const navigate = useNavigate();

    return (
        <form className="profile-form">
            <div className="profile-form__grid">
                <label>
                    <span>Имя</span>
                    <input type="text" />
                </label>

                <label>
                    <span>Фамилия</span>
                    <input type="text" />
                </label>
            </div>

            <label>
                <span>Фото профиля</span>
                <input type="file" accept="image/*" />
            </label>

            <label>
                <span>Город</span>
                <input type="text" />
            </label>

            <label>
                <span>Предметы преподавания</span>
                <input
                    type="text"
                    placeholder="Математика, Английский язык..."
                />
            </label>

            <label>
                <span>Опыт преподавания</span>
                <input
                    type="text"
                    placeholder="Например: 7 лет"
                />
            </label>

            <label>
                <span>Стоимость урока</span>
                <input
                    type="text"
                    placeholder="Например: 1200 ₽"
                />
            </label>

            <label>
                <span>Образование</span>
                <textarea rows="4" />
            </label>

            <label>
                <span>Сертификаты и дипломы</span>
                <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                />
            </label>

            <label>
                <span>О себе</span>
                <textarea rows="5" />
            </label>

            <label>
                <span>Почему ученики выбирают Вас</span>
                <textarea rows="4" />
            </label>

            <button
                type="button"
                className="profile-form__submit"
                onClick={() => navigate('/account?role=teacher')}
            >
                Сохранить и перейти в кабинет
            </button>
        </form>
    );
}