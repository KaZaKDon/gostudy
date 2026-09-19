CREATE TYPE "AccessibilityOfferType" AS ENUM ('FREE', 'DISCOUNT', 'INDIVIDUAL');

CREATE TYPE "AccessibilityOfferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "accessibility_offers" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "offer_type" "AccessibilityOfferType" NOT NULL,
    "slots" INTEGER NOT NULL,
    "discount_percent" INTEGER,
    "default_duration_months" INTEGER,
    "comment" TEXT,
    "status" "AccessibilityOfferStatus" NOT NULL DEFAULT 'PENDING',
    "supersedes_id" INTEGER,
    "moderation_comment" TEXT,
    "moderated_by" INTEGER,
    "moderated_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accessibility_offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accessibility_offers_slots_check" CHECK ("slots" BETWEEN 1 AND 10),
    CONSTRAINT "accessibility_offers_discount_check" CHECK (
        ("offer_type" = 'DISCOUNT' AND "discount_percent" BETWEEN 10 AND 90 AND MOD("discount_percent", 5) = 0)
        OR ("offer_type" <> 'DISCOUNT' AND "discount_percent" IS NULL)
    ),
    CONSTRAINT "accessibility_offers_duration_check" CHECK (
        "default_duration_months" IS NULL
        OR "default_duration_months" IN (1, 3, 6, 12)
    )
);

CREATE TABLE "accessibility_offer_subjects" (
    "offer_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,

    CONSTRAINT "accessibility_offer_subjects_pkey" PRIMARY KEY ("offer_id", "subject_id")
);

CREATE INDEX "accessibility_offers_teacher_id_offer_type_status_idx"
    ON "accessibility_offers"("teacher_id", "offer_type", "status");
CREATE INDEX "accessibility_offers_status_updated_at_idx"
    ON "accessibility_offers"("status", "updated_at");
CREATE INDEX "accessibility_offers_supersedes_id_idx"
    ON "accessibility_offers"("supersedes_id");
CREATE INDEX "accessibility_offers_moderated_by_idx"
    ON "accessibility_offers"("moderated_by");
CREATE INDEX "accessibility_offer_subjects_subject_id_idx"
    ON "accessibility_offer_subjects"("subject_id");

ALTER TABLE "accessibility_offers"
    ADD CONSTRAINT "accessibility_offers_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accessibility_offers"
    ADD CONSTRAINT "accessibility_offers_moderated_by_fkey"
    FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accessibility_offers"
    ADD CONSTRAINT "accessibility_offers_supersedes_id_fkey"
    FOREIGN KEY ("supersedes_id") REFERENCES "accessibility_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accessibility_offer_subjects"
    ADD CONSTRAINT "accessibility_offer_subjects_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "accessibility_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accessibility_offer_subjects"
    ADD CONSTRAINT "accessibility_offer_subjects_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
