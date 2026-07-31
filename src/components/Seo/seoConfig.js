const SITE_URL = 'https://gostudyonline.ru';
const DEFAULT_IMAGE_PATH = '/favicon/android-chrome-512x512.png';

const DEFAULT_DESCRIPTION = [
    'GoStudy — онлайн-платформа для поиска преподавателей, занятий',
    'с репетиторами, домашней работы, материалов и общения учеников,',
    'родителей и учителей.',
].join(' ');

const HOME_STRUCTURED_DATA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'GoStudy',
            url: `${SITE_URL}/`,
            logo: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
        },
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: 'GoStudy',
            inLanguage: 'ru-RU',
            publisher: {
                '@id': `${SITE_URL}/#organization`,
            },
        },
    ],
};

const PUBLIC_ROUTES = {
    '/': {
        title: 'GoStudy — онлайн-платформа для учеников и преподавателей',
        description: DEFAULT_DESCRIPTION,
        structuredData: HOME_STRUCTURED_DATA,
    },
    '/agreement': {
        title: 'Пользовательское соглашение — GoStudy',
        description: 'Пользовательское соглашение онлайн-платформы GoStudy.',
    },
    '/privacy': {
        title: 'Политика конфиденциальности — GoStudy',
        description: 'Политика обработки и защиты персональных данных пользователей GoStudy.',
    },
    '/rules': {
        title: 'Правила платформы — GoStudy',
        description: 'Правила безопасного общения, занятий и размещения материалов на платформе GoStudy.',
    },
};

const PRIVATE_ROUTES = {
    '/login': 'Вход — GoStudy',
    '/register': 'Регистрация — GoStudy',
    '/password-reset': 'Восстановление пароля — GoStudy',
    '/profile-start': 'Заполнение профиля — GoStudy',
    '/account': 'Личный кабинет — GoStudy',
    '/verify-email': 'Подтверждение почты — GoStudy',
};

function normalizePathname(pathname) {
    if (!pathname || pathname === '/') {
        return '/';
    }

    return `/${pathname.split('/').filter(Boolean).join('/')}`;
}

export function getSeoConfig(pathname) {
    const normalizedPathname = normalizePathname(pathname);
    const publicRoute = PUBLIC_ROUTES[normalizedPathname];

    if (publicRoute) {
        return {
            ...publicRoute,
            canonical: `${SITE_URL}${normalizedPathname === '/' ? '/' : normalizedPathname}`,
            image: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
            robots: 'index, follow',
        };
    }

    const privateTitle = PRIVATE_ROUTES[normalizedPathname];

    if (privateTitle) {
        return {
            title: privateTitle,
            description: DEFAULT_DESCRIPTION,
            image: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
            robots: 'noindex, nofollow, noarchive',
        };
    }

    if (normalizedPathname.startsWith('/classroom/')) {
        return {
            title: 'Класс — GoStudy',
            description: 'Онлайн-класс GoStudy.',
            image: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
            robots: 'noindex, nofollow, noarchive',
        };
    }

    if (
        normalizedPathname === '/admin'
        || normalizedPathname.startsWith('/admin/')
    ) {
        return {
            title: 'Администрирование — GoStudy',
            description: 'Служебный раздел GoStudy.',
            image: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
            robots: 'noindex, nofollow, noarchive',
        };
    }

    return {
        title: 'Страница не найдена — GoStudy',
        description: 'Запрашиваемая страница GoStudy не найдена.',
        image: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
        robots: 'noindex, nofollow, noarchive',
    };
}
