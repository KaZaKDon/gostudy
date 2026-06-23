export function MessagesTabs({
    tabs,
    activeTab,
    onChangeTab,
}) {
    return (
        <div className="messages-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={
                        activeTab === tab.id
                            ? 'messages-tabs__button messages-tabs__button--active'
                            : 'messages-tabs__button'
                    }
                    onClick={() => onChangeTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}