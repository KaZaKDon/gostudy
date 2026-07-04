export function TeacherProfileNavigation({
    isFirst,
    isLast,
    onBack,
    onNext,
}) {
    return (
        <div className="teacher-profile-navigation">
            <button
                type="button"
                className="teacher-profile-button teacher-profile-button--secondary"
                disabled={isFirst}
                onClick={onBack}
            >
                Назад
            </button>

            <button
                type="button"
                className="teacher-profile-button teacher-profile-button--primary"
                onClick={onNext}
            >
                {isLast ? 'Сохранить профиль' : 'Далее'}
            </button>
        </div>
    );
}