-- CreateEnum
CREATE TYPE "ParentStudentLinkRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "parent_student_link_requests" (
    "id" SERIAL NOT NULL,
    "child_profile_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "status" "ParentStudentLinkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parent_student_link_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_student_link_requests_child_profile_id_created_at_idx" ON "parent_student_link_requests"("child_profile_id", "created_at");
CREATE INDEX "parent_student_link_requests_student_id_status_expires_at_idx" ON "parent_student_link_requests"("student_id", "status", "expires_at");
CREATE UNIQUE INDEX "parent_student_link_requests_one_pending_per_card_idx" ON "parent_student_link_requests"("child_profile_id") WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "parent_student_link_requests" ADD CONSTRAINT "parent_student_link_requests_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "parent_child_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parent_student_link_requests" ADD CONSTRAINT "parent_student_link_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
