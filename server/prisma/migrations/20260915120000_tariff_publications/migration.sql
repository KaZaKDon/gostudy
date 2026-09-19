CREATE TYPE "TariffPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "tariff_publications" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TariffPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "effective_from" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "created_by" INTEGER,
    "published_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tariff_publications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tariff_publications_version_positive_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "tariff_publications_version_key"
ON "tariff_publications"("version");

CREATE INDEX "tariff_publications_status_effective_from_published_at_idx"
ON "tariff_publications"("status", "effective_from", "published_at");

CREATE INDEX "tariff_publications_created_by_idx"
ON "tariff_publications"("created_by");

CREATE INDEX "tariff_publications_published_by_idx"
ON "tariff_publications"("published_by");

ALTER TABLE "tariff_publications"
ADD CONSTRAINT "tariff_publications_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tariff_publications"
ADD CONSTRAINT "tariff_publications_published_by_fkey"
FOREIGN KEY ("published_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "tariff_publications" (
    "version",
    "status",
    "content",
    "effective_from",
    "published_at",
    "created_at",
    "updated_at"
)
VALUES (
    1,
    'PUBLISHED',
    '{
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
    }'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
