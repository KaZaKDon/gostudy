-- Preserve the legacy student preference while moving its API to NestJS.
ALTER TABLE "student_profiles"
    ADD COLUMN "parent_notifications_enabled" BOOLEAN NOT NULL DEFAULT false;
