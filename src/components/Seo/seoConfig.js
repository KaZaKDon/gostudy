import { PLATFORM_IDENTITY } from '../../config/platformIdentity.js';

export const SITE_URL = 'https://gostudyonline.ru';
export const DEFAULT_IMAGE_PATH = '/images/branding/gostudy-social-card.png';

const DEFAULT_DESCRIPTION = [
    'GoStudy — онлайн-платформа для поиска преподавателей, занятий',
    'с репетиторами, домашних заданий, учебных материалов и общения',
    'учеников, родителей и преподавателей.',
].join(' ');

export const PUBLIC_ROUTES = Object.freeze({
    '/': {
        label: 'Главная',
        title: 'GoStudy — онлайн-платформа для учеников и преподавателей',
        description: DEFAULT_DESCRIPTION,
        indexable: true,
        renderKey: 'home',
        sourceEntry: 'src/pages/Home/Home.jsx',
    },
    '/about': {
        label: 'О платформе',
        title: 'О платформе GoStudy',
        description: 'Как GoStudy помогает ученикам, родителям и преподавателям организовать онлайн-обучение.',
        indexable: true,
        renderKey: 'about',
        sourceEntry: 'src/pages/About/AboutPage.jsx',
    },
    '/students': {
        label: 'Ученикам',
        title: 'Ученикам — занятия и преподаватели в GoStudy',
        description: 'Поиск преподавателя, расписание, онлайн-занятия, домашние задания и результаты ученика в GoStudy.',
        indexable: true,
        renderKey: 'students',
        sourceEntry: 'src/pages/Students/StudentsPage.jsx',
    },
    '/teachers': {
        label: 'Преподавателям',
        title: 'Преподавателям — инструменты для работы в GoStudy',
        description: 'Ученики, расписание, онлайн-класс, задания и материалы преподавателя в GoStudy.',
        indexable: true,
        renderKey: 'teachers',
        sourceEntry: 'src/pages/Teachers/TeachersPage.jsx',
    },
    '/pricing': {
        label: 'Тарифы',
        title: 'Тарифы для преподавателей — GoStudy',
        description: 'Условия единой месячной подписки для преподавателей на платформе GoStudy.',
        indexable: true,
        renderKey: 'pricing',
        sourceEntry: 'src/pages/Pricing/PricingPage.jsx',
    },
    '/payment-and-refunds': {
        label: 'Оплата и возврат',
        title: 'Оплата, получение доступа и возврат — GoStudy',
        description: 'Оплата цифровой подписки GoStudy, активация доступа, автоматическое продление, отмена и порядок возврата денежных средств.',
        indexable: true,
        renderKey: 'paymentAndRefunds',
        sourceEntry: 'src/pages/CommercialInfo/PaymentAndRefundsPage.jsx',
    },
    '/requisites': {
        label: 'Реквизиты',
        title: 'Реквизиты — GoStudy',
        description: 'Регистрационные сведения и контакты оператора платформы GoStudy.',
        indexable: true,
        renderKey: 'requisites',
        sourceEntry: 'src/pages/CommercialInfo/RequisitesPage.jsx',
        schemaType: 'AboutPage',
    },
    '/support': {
        label: 'Поддержка',
        title: 'Поддержка — GoStudy',
        description: 'Контакты поддержки GoStudy по вопросам аккаунта, подписки, платежей и работы платформы.',
        indexable: true,
        renderKey: 'support',
        sourceEntry: 'src/pages/CommercialInfo/SupportPage.jsx',
        schemaType: 'ContactPage',
    },
    '/legal/offer': {
        label: 'Публичная оферта',
        title: 'Публичная оферта на подписку — GoStudy',
        description: 'Условия приобретения месячной подписки на доступ к функциям платформы GoStudy.',
        renderKey: 'legal:offer',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/agreement': {
        label: 'Пользовательское соглашение',
        title: 'Пользовательское соглашение — GoStudy',
        description: 'Пользовательское соглашение онлайн-платформы GoStudy.',
        renderKey: 'legal:agreement',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/privacy': {
        label: 'Политика конфиденциальности',
        title: 'Политика конфиденциальности — GoStudy',
        description: 'Политика обработки и защиты персональных данных пользователей GoStudy.',
        renderKey: 'legal:privacy',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/rules': {
        label: 'Правила платформы',
        title: 'Правила платформы — GoStudy',
        description: 'Правила безопасного общения, занятий и размещения материалов на платформе GoStudy.',
        renderKey: 'legal:rules',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/tariffs': {
        label: 'Правила тарифа',
        title: 'Правила тарифа и подписки — GoStudy',
        description: 'Условия единой месячной подписки преподавателя на доступ к функциям GoStudy.',
        renderKey: 'legal:tariffs',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/personal-data-consent': {
        label: 'Согласие на обработку персональных данных',
        title: 'Согласие на обработку персональных данных — GoStudy',
        description: 'Юридический документ онлайн-платформы GoStudy.',
        renderKey: 'legal:personal-data-consent',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/parent-child-data-consent': {
        label: 'Согласие на обработку данных ребёнка',
        title: 'Согласие Родителя на обработку данных ребёнка — GoStudy',
        description: 'Юридический документ онлайн-платформы GoStudy.',
        renderKey: 'legal:parent-child-data-consent',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
    '/legal/marketing-consent': {
        label: 'Согласие на сообщения',
        title: 'Согласие на информационные и рекламные сообщения — GoStudy',
        description: 'Юридический документ онлайн-платформы GoStudy.',
        renderKey: 'legal:marketing-consent',
        sourceEntry: 'src/data/legal/LegalPage.jsx',
    },
});

export const INDEXABLE_PUBLIC_ROUTES = Object.freeze(
    Object.entries(PUBLIC_ROUTES)
        .filter(([, route]) => route.indexable)
        .map(([pathname]) => pathname),
);

export const PRERENDER_PUBLIC_ROUTES = Object.freeze(
    Object.keys(PUBLIC_ROUTES),
);

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

function createOrganizationData() {
    return {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: PLATFORM_IDENTITY.brandName,
        legalName: PLATFORM_IDENTITY.legalName,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/images/branding/logo-gostudy.svg`,
        email: PLATFORM_IDENTITY.supportEmail,
    };
}

function createStructuredData(pathname, route) {
    const pageUrl = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
    const graph = [
        createOrganizationData(),
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: PLATFORM_IDENTITY.brandName,
            inLanguage: 'ru-RU',
            publisher: { '@id': `${SITE_URL}/#organization` },
        },
        {
            '@type': route.schemaType ?? 'WebPage',
            '@id': `${pageUrl}#webpage`,
            url: pageUrl,
            name: route.title,
            description: route.description,
            inLanguage: 'ru-RU',
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@id': `${SITE_URL}/#organization` },
        },
    ];

    if (pathname !== '/') {
        graph.push({
            '@type': 'BreadcrumbList',
            '@id': `${pageUrl}#breadcrumb`,
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Главная',
                    item: `${SITE_URL}/`,
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: route.label,
                    item: pageUrl,
                },
            ],
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}

export function getSeoConfig(pathname) {
    const normalizedPathname = normalizePathname(pathname);
    const publicRoute = PUBLIC_ROUTES[normalizedPathname];

    if (publicRoute) {
        return {
            ...publicRoute,
            canonical: `${SITE_URL}${normalizedPathname === '/' ? '/' : normalizedPathname}`,
            image: `${SITE_URL}${DEFAULT_IMAGE_PATH}`,
            imageWidth: '1200',
            imageHeight: '630',
            imageAlt: 'GoStudy — онлайн-платформа для обучения',
            robots: publicRoute.indexable
                ? 'index, follow'
                : 'noindex, nofollow, noarchive',
            structuredData: createStructuredData(normalizedPathname, publicRoute),
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
