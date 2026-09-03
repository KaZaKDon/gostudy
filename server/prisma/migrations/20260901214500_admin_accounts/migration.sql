ALTER TABLE "users"
ADD COLUMN "blocked_reason" VARCHAR(1000),
ADD COLUMN "archived_at" TIMESTAMPTZ(3),
ADD COLUMN "archived_by" INTEGER,
ADD COLUMN "archive_reason" VARCHAR(1000);

CREATE TABLE "admin_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" INTEGER,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX "users_archived_by_idx" ON "users"("archived_by");
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx"
ON "admin_audit_logs"("admin_id", "created_at");
CREATE INDEX "admin_audit_logs_entity_type_entity_id_created_at_idx"
ON "admin_audit_logs"("entity_type", "entity_id", "created_at");

ALTER TABLE "users"
ADD CONSTRAINT "users_archived_by_fkey"
FOREIGN KEY ("archived_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_audit_logs"
ADD CONSTRAINT "admin_audit_logs_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
