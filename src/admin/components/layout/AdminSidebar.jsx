import {
    useEffect,
    useState,
} from 'react';

import {
    NavLink,
} from 'react-router-dom';

const navigationGroups = [
    [
        {
            label: 'Панель',
            to: '/admin/dashboard',
        },
    ],
    [
        {
            label: 'Аккаунты',
            to: '/admin/accounts',
        },
        {
            label: 'Ученики',
            to: '/admin/students',
        },
        {
            label: 'Преподаватели',
            to: '/admin/teachers',
        },
        {
            label: 'Документы',
            to: '/admin/documents',
        },
    ],
    [
        {
            label: 'Группы предметов',
            to: '/admin/dictionaries/subject-groups',
        },
        {
            label: 'Предметы',
            to: '/admin/dictionaries/subjects',
        },
        {
            label: 'Группы подготовки',
            to: '/admin/dictionaries/preparation-groups',
        },
        {
            label: 'Направления подготовки',
            to: '/admin/dictionaries/preparations',
        },
        {
            label: 'Возрастные группы',
            to: '/admin/dictionaries/age-groups',
        },
        {
            label: 'Связи предметов',
            to: '/admin/dictionaries/subject-preparations',
        },
    ],
    [
        {
            label: 'Отзывы',
            to: '/admin/reviews',
        },
        {
            label: 'Жалобы',
            to: '/admin/reports',
        },
    ],
    [
        {
            label: 'Финансы',
            to: '/admin/payments',
        },
    ],
    [
        {
            label: 'Журнал действий',
            to: '/admin/logs',
        },
        {
            label: 'Настройки',
            to: '/admin/settings',
        },
    ],
];

export function AdminSidebar() {
    const [theme, setTheme] = useState(
        () => (
            localStorage.getItem(
                'gostudy-admin-theme',
            ) || 'light'
        ),
    );

    useEffect(() => {
        document.documentElement
            .dataset.adminTheme = theme;

        localStorage.setItem(
            'gostudy-admin-theme',
            theme,
        );
    }, [theme]);

    function handleThemeChange() {
        setTheme((currentTheme) => (
            currentTheme === 'dark'
                ? 'light'
                : 'dark'
        ));
    }

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar__top">
                <div className="admin-sidebar__brand">
                    <span className="admin-sidebar__title">
                        GoStudy
                    </span>

                    <span className="admin-sidebar__subtitle">
                        ADMIN
                    </span>
                </div>

                <nav className="admin-sidebar__nav">
                    {navigationGroups.map(
                        (group, groupIndex) => (
                            <div
                                className="admin-sidebar__group"
                                key={groupIndex}
                            >
                                {group.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({
                                            isActive,
                                        }) => (
                                            isActive
                                                ? 'admin-sidebar__link admin-sidebar__link--active'
                                                : 'admin-sidebar__link'
                                        )}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        ),
                    )}
                </nav>
            </div>

            <div className="admin-sidebar__bottom">
                <button
                    className="admin-theme-toggle"
                    type="button"
                    onClick={handleThemeChange}
                >
                    <span className="admin-theme-toggle__label">
                        Тема
                    </span>

                    <span className="admin-theme-toggle__value">
                        {theme === 'dark'
                            ? 'Тёмная'
                            : 'Светлая'}
                    </span>
                </button>

                <div className="admin-sidebar__version">
                    <span>GoStudy Admin</span>
                    <strong>v1.0.0</strong>
                </div>
            </div>
        </aside>
    );
}