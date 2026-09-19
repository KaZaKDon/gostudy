-- Restore the initial public tariff only when no published revision exists.
-- This migration is intentionally data-only and does not remove or alter schema objects.
INSERT INTO "tariff_publications" (
    "version",
    "status",
    "content",
    "effective_from",
    "published_at",
    "created_at",
    "updated_at"
)
SELECT
    COALESCE((SELECT MAX("version") FROM "tariff_publications"), 0) + 1,
    'PUBLISHED'::"TariffPublicationStatus",
    $tariff$
    {
        "page_title": "Тарифы GoStudy",
        "page_lead": "Два понятных варианта работы для преподавателя — с оплатой занятий через платформу или по подписке.",
        "individual": {
            "title": "Физическое лицо",
            "badge": "Подписка",
            "summary": "Для преподавателей, которые самостоятельно рассчитываются с учениками и оплачивают использование GoStudy.",
            "price_rubles": 990,
            "period_days": 30,
            "students_included": 2,
            "extra_block_students": 2,
            "extra_block_price_rubles": 400,
            "recalculation_text": "При увеличении или уменьшении числа активных учеников тариф пересчитывается в день изменения. Неиспользованный остаток учитывается в новом расчёте, а новый оплаченный период начинается с этой даты.",
            "features": [
                "Количество занятий не ограничено",
                "Расписание, сообщения, задания и онлайн-класс",
                "До 200 МБ для учебных материалов",
                "Перерасчёт при изменении количества учеников"
            ]
        },
        "business": {
            "title": "Самозанятый / ИП",
            "badge": "Комиссионная модель",
            "summary": "Для преподавателей, которые принимают оплату занятий через GoStudy и ведут расчёты в кабинете.",
            "commission_percent": 15,
            "minimum_payout_rubles": 500,
            "payout_frequency": "Раз в неделю",
            "settlement_text": "Начисление формируется по каждому проведённому уроку, а доступная сумма перечисляется раз в неделю. Неоплаченные и спорные занятия учитываются отдельно.",
            "features": [
                "Учёт оплаченных и проведённых уроков",
                "Начисление по каждому проведённому уроку",
                "Еженедельное перечисление доступной суммы",
                "История начислений, комиссии и выплат"
            ]
        },
        "notice": "Стоимость занятий преподаватель устанавливает самостоятельно. Подробные условия фиксируются в документах платформы."
    }
    $tariff$::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "tariff_publications"
    WHERE "status" = 'PUBLISHED'::"TariffPublicationStatus"
);
