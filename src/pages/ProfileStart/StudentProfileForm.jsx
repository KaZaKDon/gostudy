import { useNavigate } from 'react-router-dom';

export function StudentProfileForm() {
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
                <span>Город</span>
                <input type="text" />
            </label>

            <label>
                <span>Возраст</span>
                <input type="number" />
            </label>

            <label>
                <span>Предметы для изучения</span>
                <input
                    type="text"
                    placeholder="Математика, Английский язык..."
                />
            </label>

            <label>
                <span>Цель обучения</span>
                <textarea rows="4" />
            </label>

            <label>
                <span>О себе</span>
                <textarea rows="4" />
            </label>

            <button
                type="button"
                className="profile-form__submit"
                onClick={() => navigate('/account?role=student')}
            >
                Сохранить и перейти в кабинет
            </button>
        </form>
    );
}