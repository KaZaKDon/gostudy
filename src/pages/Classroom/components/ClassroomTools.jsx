const CLASSROOM_TOOLS = [
    { id: 'lesson', label: 'Урок' },
    { id: 'material', label: 'Материал' },
    { id: 'calculator', label: 'Калькулятор' },
    { id: 'video', label: 'Видео', future: true },
    { id: 'screen', label: 'Показать экран', future: true },
    { id: 'board', label: 'Доска', future: true },
];

export function ClassroomTools({ activeTool, onChangeTool }) {
    return (
        <nav className="classroom-tools" aria-label="Инструменты урока">
            {CLASSROOM_TOOLS.map((tool) => (
                <button
                    type="button"
                    className={
                        activeTool === tool.id
                            ? 'classroom-tools__button classroom-tools__button--active'
                            : 'classroom-tools__button'
                    }
                    key={tool.id}
                    title={tool.future ? 'Будет подключено после видеосервера' : ''}
                    onClick={() => onChangeTool(tool.id)}
                >
                    {tool.label}
                    {tool.future && <small>позже</small>}
                </button>
            ))}
        </nav>
    );
}
