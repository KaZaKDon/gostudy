const CLASSROOM_TOOLS = [
    {
        id: 'video',
        label: 'Видео',
    },
    {
        id: 'material',
        label: 'Материал',
    },
    {
        id: 'screen',
        label: 'Показать экран',
    },
    {
        id: 'board',
        label: 'Доска',
    },
    {
        id: 'calculator',
        label: 'Калькулятор',
    },
];

export function ClassroomTools({ activeTool, onChangeTool }) {
    return (
        <nav
            className="classroom-tools"
            aria-label="Инструменты урока"
        >
            {CLASSROOM_TOOLS.map((tool) => (
                <button
                    type="button"
                    className={
                        activeTool === tool.id
                            ? 'classroom-tools__button classroom-tools__button--active'
                            : 'classroom-tools__button'
                    }
                    key={tool.id}
                    onClick={() => onChangeTool(tool.id)}
                >
                    {tool.label}
                </button>
            ))}
        </nav>
    );
}