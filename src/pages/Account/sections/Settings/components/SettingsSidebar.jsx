export function SettingsSidebar({
    tabs,
    activeTab,
    onChangeTab,
}) {
    return (
        <aside className="settings-sidebar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={
                        activeTab === tab.id
                            ? 'settings-sidebar__button settings-sidebar__button--active'
                            : 'settings-sidebar__button'
                    }
                    onClick={() => onChangeTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </aside>
    );
}