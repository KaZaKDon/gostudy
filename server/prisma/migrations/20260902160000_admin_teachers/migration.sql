ALTER TABLE "teacher_profiles"
    ADD COLUMN "verification_comment" VARCHAR(1000),
    ADD COLUMN "verified_by" INTEGER,
    ADD COLUMN "verified_at" TIMESTAMPTZ(3);

CREATE INDEX "teacher_profiles_verification_status_is_visible_idx"
    ON "teacher_profiles"("verification_status", "is_visible");

CREATE INDEX "teacher_profiles_verified_by_idx"
    ON "teacher_profiles"("verified_by");

ALTER TABLE "teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_verified_by_fkey"
    FOREIGN KEY ("verified_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
