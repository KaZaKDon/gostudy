import { AccountThemeSwitcher } from './AccountThemeSwitcher.jsx';

export function AccountSidebar({
    profile,
    navigation,
    activeSection,
    onSelectSection,
    isOpen,
}) {
    const initials = `${profile.firstName[0]}${profile.lastName[0]}`;

    return (
        <aside
            className={
                isOpen
                    ? 'account-sidebar account-sidebar--open'
                    : 'account-sidebar'
            }
        >
            <div className="account-sidebar__profile">
                <div className="account-sidebar__avatar">
                    {initials}
                </div>

                <strong>
                    {profile.firstName} {profile.lastName}
                </strong>

                <span>
                    {profile.roleTitle}
                </span>
            </div>

            <nav className="account-sidebar__nav">
                {navigation.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={
                            item.id === activeSection
                                ? 'account-sidebar__link account-sidebar__link--active'
                                : 'account-sidebar__link'
                        }
                        onClick={() => onSelectSection(item.id)}
                    >
                        <span>{item.title}</span>

                        {item.count ? <b>{item.count}</b> : null}
                    </button>
                ))}
            </nav>

            <AccountThemeSwitcher />
        </aside>
    );
}