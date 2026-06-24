const WORKSPACE_CONTENT = {
    video: {
        title: 'Видеоурок',
        text: 'Здесь будет основной экран видеосвязи. Сейчас это рабочая заглушка интерфейса.',
    },
    material: {
        title: 'Демонстрация материала',
        text: 'Здесь преподаватель сможет открыть PDF, презентацию, изображение или учебный файл.',
    },
    screen: {
        title: 'Показ экрана',
        text: 'Здесь будет отображаться демонстрация экрана преподавателя или ученика.',
    },
    board: {
        title: 'Доска',
        text: 'Здесь появится интерактивная доска для формул, схем и решения задач.',
    },
    calculator: {
        title: 'Калькулятор',
        text: 'Здесь будет учебный калькулятор и дополнительные принадлежности урока.',
    },
};

export function ClassroomWorkspace({ activeTool, lesson }) {
    const content = WORKSPACE_CONTENT[activeTool] ?? WORKSPACE_CONTENT.video;

    return (
        <section className="classroom-workspace">
            <div className="classroom-workspace__screen">
                <span className="classroom-workspace__label">
                    {lesson.subject}
                </span>

                <div className="classroom-workspace__placeholder">
                    <strong>{content.title}</strong>
                    <p>{content.text}</p>
                </div>
            </div>
        </section>
    );
}