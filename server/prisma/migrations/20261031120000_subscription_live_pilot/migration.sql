ALTER TABLE "subscription_orders" DROP CONSTRAINT "subscription_orders_is_test_check";
ALTER TABLE "subscription_orders" ADD COLUMN "live_details" JSONB;
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_live_details_check"
 CHECK ("is_test" OR "live_details" IS NOT NULL);
CREATE TABLE "subscription_periods" (
 "id" SERIAL PRIMARY KEY, "order_id" INTEGER NOT NULL UNIQUE REFERENCES "subscription_orders"("id") ON DELETE RESTRICT,
 "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "starts_at" TIMESTAMPTZ(3) NOT NULL, "ends_at" TIMESTAMPTZ(3) NOT NULL,
 "students" INTEGER NOT NULL CHECK ("students" > 0), CHECK ("ends_at" > "starts_at")
);
CREATE INDEX "subscription_periods_user_id_ends_at_idx" ON "subscription_periods"("user_id", "ends_at");
CREATE TABLE "subscription_receipt_jobs" (
 "id" SERIAL PRIMARY KEY, "order_id" INTEGER NOT NULL UNIQUE REFERENCES "subscription_orders"("id") ON DELETE RESTRICT,
 "due_at" TIMESTAMPTZ(3) NOT NULL, "state" VARCHAR(20) NOT NULL DEFAULT 'scheduled'
 CHECK ("state" IN ('scheduled', 'submitted', 'registered', 'review', 'held')),
 "lease_until" TIMESTAMPTZ(3), "lease_token" VARCHAR(36), "next_attempt_at" TIMESTAMPTZ(3) NOT NULL,
 "submitted_at" TIMESTAMPTZ(3), "registered_at" TIMESTAMPTZ(3), "attempts" INTEGER NOT NULL DEFAULT 0,
 "last_code" VARCHAR(80), "fiscal_data" JSONB, "hold_reason" VARCHAR(500)
);
CREATE INDEX "subscription_receipt_jobs_state_next_attempt_at_idx" ON "subscription_receipt_jobs"("state", "next_attempt_at");
