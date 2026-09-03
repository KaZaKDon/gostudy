-- Internal notifications for requests, lessons and future platform events.

CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "dedupe_key" VARCHAR(190),
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "target_section" VARCHAR(64),
    "target_entity_type" VARCHAR(64),
    "target_entity_id" INTEGER,
    "target_date" VARCHAR(10),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key"
    ON "notifications"("user_id", "dedupe_key");
CREATE INDEX "notifications_user_id_id_idx"
    ON "notifications"("user_id", "id");
CREATE INDEX "notifications_user_id_is_read_idx"
    ON "notifications"("user_id", "is_read");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
