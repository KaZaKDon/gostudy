import {
    useEffect,
    useState,
} from 'react';

import {
    useLocation,
    useNavigate,
} from 'react-router-dom';

const pageMeta = {
    '/admin/dashboard': {
        title: 'Панель',
        description:
            'Обзор состояния платформы',
    },

    '/admin/accounts': {
        title: 'Аккаунты',
        description:
            'Управление учётными записями пользователей',
    },

    '/admin/students': {
        title: 'Ученики',
        description:
            'Профили учеников и история обучения',
    },

    '/admin/teachers': {
        title: 'Преподаватели',
        description:
            'Анкеты, проверка и модерация преподавателей',
    },

    '/admin/documents': {
        title: 'Документы',
        description:
            'Проверка документов преподавателей',
    },

    '/admin/dictionaries/subject-groups': {
        title: 'Группы предметов',
        description:
            'Управление разделами справочника предметов',
    },

    '/admin/dictionaries/subjects': {
        title: 'Предметы',
        description:
            'Управление предметами и их распределением по группам',
    },

    '/admin/reviews': {
        title: 'Отзывы',
        description:
            'Модерация отзывов платформы',
    },

    '/admin/reports': {
        title: 'Жалобы',
        description:
            'Обработка жалоб и спорных ситуаций',
    },

    '/admin/payments': {
        title: 'Финансы',
        description:
            'Платежи, выплаты и финансовые операции',
    },

    '/admin/logs': {
        title: 'Журнал действий',
        description:
            'История действий администраторов и модераторов',
    },

    '/admin/settings': {
        title: 'Настройки',
        description:
            'Системные параметры платформы',
    },

    '/admin/dictionaries/age-groups': {
        title: 'Возрастные группы',
        description:
            'Управление возрастными категориями преподавателей.',
    },

    '/admin/dictionaries/subject-preparations': {
        title: 'Связи предметов',
        description:
            'Настройка направлений подготовки для каждого предмета.',
    },
};

const roleLabels = {
    admin: 'Администратор',
    moderator: 'Модератор',
};

export function AdminHeader() {
    const location = useLocation();
    const navigate = useNavigate();

    const [user, setUser] =
        useState(null);

    const meta =
        pageMeta[location.pathname]
        || {
            title: 'Админка',
            description:
                'Административная панель GoStudy',
        };

    useEffect(() => {
        let isActive = true;

        fetch('/api/admin/auth/me.php', {
            credentials: 'include',
        })
            .then((response) => (
                response.json()
            ))
            .then((data) => {
                if (
                    isActive
                    && data.success
                ) {
                    setUser(data.data.user);
                }
            })
            .catch(() => {
                if (isActive) {
                    setUser(null);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    async function handleLogout() {
        try {
            await fetch(
                '/api/admin/auth/logout.php',
                {
                    credentials: 'include',
                },
            );
        } finally {
            navigate(
                '/admin/login',
                {
                    replace: true,
                },
            );
        }
    }

    return (
        <header className="admin-header">
            <div className="admin-header__page">
                <p className="admin-header__label">
                    Административная панель
                </p>

                <h1 className="admin-header__title">
                    {meta.title}
                </h1>

                <p className="admin-header__description">
                    {meta.description}
                </p>
            </div>

            <div className="admin-header__user">
                <div className="admin-header__user-info">
                    <strong>
                        {
                            user?.full_name
                            || user?.email
                            || 'Administrator'
                        }
                    </strong>

                    <span>
                        {
                            roleLabels[user?.role]
                            || 'Администратор'
                        }
                    </span>
                </div>

                <button
                    className="admin-header__logout"
                    type="button"
                    onClick={handleLogout}
                >
                    Выйти
                </button>
            </div>
        </header>
    );
}