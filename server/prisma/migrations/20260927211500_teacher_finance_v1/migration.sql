CREATE TYPE "LessonPaymentStatus" AS ENUM (
    'NOT_DUE',
    'AWAITING_PAYMENT',
    'PAY_LATER',
    'PAID',
    'WAIVED',
    'REFUNDED'
);

CREATE TYPE "LessonPayoutStatus" AS ENUM (
    'NOT_READY',
    'READY',
    'PAID',
    'HELD'
);

CREATE TABLE "lesson_settlements" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "teacher_amount" DECIMAL(12,2) NOT NULL,
    "tariff_version" INTEGER,
    "payment_status" "LessonPaymentStatus" NOT NULL DEFAULT 'NOT_DUE',
    "payout_status" "LessonPayoutStatus" NOT NULL DEFAULT 'NOT_READY',
    "payment_due_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "payout_paid_at" TIMESTAMPTZ(3),
    "payment_comment" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_settlements_lesson_id_key"
    ON "lesson_settlements"("lesson_id");
CREATE INDEX "lesson_settlements_teacher_id_payment_status_payment_due_idx"
    ON "lesson_settlements"("teacher_id", "payment_status", "payment_due_at");
CREATE INDEX "lesson_settlements_teacher_id_payout_status_updated_at_idx"
    ON "lesson_settlements"("teacher_id", "payout_status", "updated_at");
CREATE INDEX "lesson_settlements_student_id_payment_status_payment_due_idx"
    ON "lesson_settlements"("student_id", "payment_status", "payment_due_at");

ALTER TABLE "lesson_settlements"
    ADD CONSTRAINT "lesson_settlements_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_settlements"
    ADD CONSTRAINT "lesson_settlements_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lesson_settlements"
    ADD CONSTRAINT "lesson_settlements_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

WITH active_tariff AS (
    SELECT
        "version",
        CASE
            WHEN jsonb_typeof("content"->'business'->'commission_percent') = 'number'
                THEN ("content"->'business'->>'commission_percent')::numeric
            ELSE 0::numeric
        END AS commission_percent
    FROM "tariff_publications"
    WHERE "status" = 'PUBLISHED'::"TariffPublicationStatus"
    ORDER BY "effective_from" DESC NULLS LAST, "version" DESC
    LIMIT 1
), lesson_prices AS (
    SELECT
        lessons."id" AS lesson_id,
        lessons."teacher_id",
        lessons."student_id",
        lessons."status",
        lessons."lesson_date",
        lessons."duration_minutes",
        lessons."updated_at",
        sessions."ended_at",
        tariffs."version" AS tariff_version,
        COALESCE(tariffs.commission_percent, 0::numeric) AS commission_percent,
        CASE lessons."duration_minutes"
            WHEN 45 THEN COALESCE(profiles."price_45", 0::numeric)
            WHEN 60 THEN COALESCE(profiles."price_60", 0::numeric)
            WHEN 90 THEN COALESCE(profiles."price_90", 0::numeric)
            ELSE 0::numeric
        END AS gross_amount
    FROM "lessons" lessons
    LEFT JOIN "teacher_profiles" profiles
        ON profiles."user_id" = lessons."teacher_id"
    LEFT JOIN "lesson_sessions" sessions
        ON sessions."lesson_id" = lessons."id"
    LEFT JOIN active_tariff tariffs ON TRUE
)
INSERT INTO "lesson_settlements" (
    "lesson_id",
    "teacher_id",
    "student_id",
    "gross_amount",
    "commission_percent",
    "commission_amount",
    "teacher_amount",
    "tariff_version",
    "payment_status",
    "payout_status",
    "payment_due_at",
    "created_at",
    "updated_at"
)
SELECT
    lesson_id,
    teacher_id,
    student_id,
    ROUND(gross_amount, 2),
    ROUND(commission_percent, 2),
    ROUND(gross_amount * commission_percent / 100, 2),
    ROUND(gross_amount - (gross_amount * commission_percent / 100), 2),
    tariff_version,
    CASE
        WHEN "status" = 'COMPLETED'::"LessonStatus"
            THEN 'AWAITING_PAYMENT'::"LessonPaymentStatus"
        WHEN "status" = 'CANCELLED'::"LessonStatus"
            THEN 'WAIVED'::"LessonPaymentStatus"
        ELSE 'NOT_DUE'::"LessonPaymentStatus"
    END,
    'NOT_READY'::"LessonPayoutStatus",
    CASE
        WHEN "status" = 'COMPLETED'::"LessonStatus"
            THEN COALESCE(ended_at, updated_at, lesson_date + duration_minutes * INTERVAL '1 minute')
                + INTERVAL '24 hours'
        ELSE NULL
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM lesson_prices;
