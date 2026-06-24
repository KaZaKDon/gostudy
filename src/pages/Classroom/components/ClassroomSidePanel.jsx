const PANEL_TABS = [
    {
        id: 'materials',
        label: 'Материалы',
    },
    {
        id: 'homework',
        label: 'Домашнее',
    },
    {
        id: 'notes',
        label: 'Заметки',
        teacherOnly: true,
    },
];

export function ClassroomSidePanel({
    role,
    activePanel,
    materials,
    homework,
    onChangePanel,
}) {
    const visibleTabs = PANEL_TABS.filter((tab) => {
        return !tab.teacherOnly || role === 'teacher';
    });

    return (
        <section className="classroom-card classroom-side-panel">
            <div className="classroom-side-panel__tabs">
                {visibleTabs.map((tab) => (
                    <button
                        type="button"
                        className={
                            activePanel === tab.id
                                ? 'classroom-side-panel__tab classroom-side-panel__tab--active'
                                : 'classroom-side-panel__tab'
                        }
                        key={tab.id}
                        onClick={() => onChangePanel(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activePanel === 'materials' && (
                <div className="classroom-side-panel__content">
                    {materials.map((material) => (
                        <article
                            className="classroom-material"
                            key={material.id}
                        >
                            <span>{material.type}</span>
                            <strong>{material.title}</strong>
                            <button type="button">Открыть</button>
                        </article>
                    ))}
                </div>
            )}

            {activePanel === 'homework' && (
                <div className="classroom-side-panel__content">
                    <article className="classroom-homework-preview">
                        <span>{homework.deadline}</span>
                        <h3>{homework.title}</h3>
                        <p>{homework.description}</p>
                    </article>
                </div>
            )}

            {activePanel === 'notes' && role === 'teacher' && (
                <div className="classroom-side-panel__content">
                    <label className="classroom-notes">
                        <span>Личные заметки преподавателя</span>
                        <textarea
                            rows="7"
                            placeholder="Например: повторить дискриминант, обратить внимание на ошибки в знаках..."
                        />
                    </label>
                </div>
            )}
        </section>
    );
}