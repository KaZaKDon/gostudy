CREATE TABLE "parent_notification_preferences" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "homework_enabled" BOOLEAN NOT NULL DEFAULT true,
    "diary_enabled" BOOLEAN NOT NULL DEFAULT true,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT true,
    "messages_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parent_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parent_notification_preferences_parent_id_student_id_key"
ON "parent_notification_preferences"("parent_id", "student_id");

ALTER TABLE "parent_notification_preferences"
ADD CONSTRAINT "parent_notification_preferences_parent_id_student_id_fkey"
FOREIGN KEY ("parent_id", "student_id")
REFERENCES "parent_students"("parent_id", "student_id")
ON DELETE CASCADE
ON UPDATE CASCADE;
