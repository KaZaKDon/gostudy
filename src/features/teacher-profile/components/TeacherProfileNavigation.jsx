export function TeacherProfileNavigation({
    isFirst,
    isLast,
    isSaving = false,
    isDisabled = false,
    onBack,
    onNext,
    onSave,
}) {
    const handlePrimaryAction = () => {
        if (isLast) {
            onSave?.();
            return;
        }

        onNext();
    };

    return (
        <div className="teacher-profile-navigation">
            <button
                type="button"
                className="teacher-profile-button teacher-profile-button--secondary"
                disabled={isFirst || isSaving || isDisabled}
                onClick={onBack}
            >
                Назад
            </button>

            <button
                type="button"
                className="teacher-profile-button teacher-profile-button--primary"
                disabled={isSaving || isDisabled}
                onClick={handlePrimaryAction}
            >
                {isSaving
                    ? 'Сохраняем...'
                    : isLast
                        ? 'Сохранить профиль'
                        : 'Далее'}
            </button>
        </div>
    );
}
