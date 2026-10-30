export function tariffPublication(price = 990, version = 2) {
    return {
        id: version, version, status: 'published',
        effective_from: '2026-10-08T12:00:00.000Z',
        content: {
            page_title: 'Тарифы GoStudy',
            page_lead: 'Доступ к платформе на 30 дней.',
            individual: {
                title: 'Единый тариф преподавателя', badge: 'Для всех преподавателей',
                summary: 'Доступ к функциям платформы.', price_rubles: price,
                period_days: 30, students_included: 2,
                extra_block_students: 2, extra_block_price_rubles: 400,
                recalculation_text: 'Уменьшение применяется со следующего периода.',
                features: ['Расписание и онлайн-класс', 'Сообщения и домашние задания'],
            },
            business: { enabled: false, features: [] },
            lesson_payments: { enabled: false, title: 'Оплата занятий напрямую', notice: 'Платформа не принимает оплату уроков.' },
            materials: {
                sales_enabled: false, sale_commission_percent: 25, payout_hold_days: 7,
                title: 'Учебные материалы', lead: 'Материалы входят в подписку.',
                personal_library_text: 'Личная библиотека', free_catalog_text: 'Публикация после модерации',
                sales_notice: 'Платная продажа материалов отключена.',
            },
            notice: 'Условия доступны до оплаты.',
        },
    };
}
