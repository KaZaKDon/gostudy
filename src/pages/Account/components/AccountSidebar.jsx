import { LogOut } from 'lucide-react';

import { AccountThemeSwitcher } from './AccountThemeSwitcher.jsx';

export function AccountSidebar({
    identity,
    navigation,
    activeSection,
    onSelectSection,
    onLogout,
    isLoggingOut,
    isOpen,
}) {
    const avatarUrl = identity?.avatarUrl;

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
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={identity.displayName}
                            className="account-sidebar__avatar-image"
                        />
                    ) : (
                        identity.initials
                    )}
                </div>

                <strong>
                    {identity.displayName}
                </strong>
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

            <div className="account-sidebar__footer">
                <AccountThemeSwitcher />

                <button
                    className="account-sidebar__logout"
                    type="button"
                    onClick={onLogout}
                    disabled={isLoggingOut}
                >
                    <LogOut aria-hidden="true" />
                    <span>{isLoggingOut ? 'Выходим…' : 'Выйти'}</span>
                </button>
            </div>
        </aside>
    );
}
