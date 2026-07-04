export function TeacherProfileProgress({
    steps,
    currentStepIndex,
    onStepClick,
}) {
    return (
        <nav className="teacher-profile-progress" aria-label="Шаги профиля">
            {steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isDone = index < currentStepIndex;

                return (
                    <button
                        key={step.id}
                        type="button"
                        className={[
                            'teacher-profile-progress__item',
                            isActive ? 'is-active' : '',
                            isDone ? 'is-done' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => onStepClick(index)}
                    >
                        <span>{isDone ? '✓' : index + 1}</span>
                        {step.title}
                    </button>
                );
            })}
        </nav>
    );
}