CREATE TABLE "subscription_orders" (
 "id" SERIAL PRIMARY KEY,
 "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
 "amount_kopecks" INTEGER NOT NULL CHECK ("amount_kopecks" > 0),
 "tariff" JSONB NOT NULL,
 "extra_blocks" INTEGER NOT NULL CHECK ("extra_blocks" BETWEEN 0 AND 100),
 "status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'paid')),
 "is_test" BOOLEAN NOT NULL DEFAULT true CHECK ("is_test" = true),
 "paid_at" TIMESTAMPTZ(3),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "subscription_orders_user_id_created_at_idx" ON "subscription_orders"("user_id", "created_at");
CREATE TABLE "subscription_trials" (
 "user_id" INTEGER PRIMARY KEY REFERENCES "users"("id") ON DELETE RESTRICT,
 "expires_at" TIMESTAMPTZ(3) NOT NULL,
 "students" INTEGER NOT NULL CHECK ("students" > 0)
);
