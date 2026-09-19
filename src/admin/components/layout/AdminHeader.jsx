import {
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { useAdminAuth } from '../../auth/useAdminAuth.js';

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

    '/admin/profile-media': {
        title: 'Фото и видео',
        description:
            'Модерация фотографий и видеовизиток преподавателей',
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

    '/admin/materials': {
        title: 'Материалы',
        description:
            'Проверка публикаций и обработка жалоб',
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

    '/admin/tariffs': {
        title: 'Тарифы',
        description:
            'Редактирование и публикация условий платформы',
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
    const {
        logout,
        user,
    } = useAdminAuth();

    const meta =
        pageMeta[location.pathname]
        || {
            title: 'Админка',
            description:
                'Административная панель GoStudy',
        };

    async function handleLogout() {
        try {
            await logout();
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
