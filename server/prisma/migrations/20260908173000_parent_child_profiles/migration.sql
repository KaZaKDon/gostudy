-- CreateEnum
CREATE TYPE "LegalRepresentativeType" AS ENUM ('PARENT', 'GUARDIAN', 'TRUSTEE');
CREATE TYPE "ParentChildVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "parent_child_profiles" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "student_id" INTEGER,
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "middle_name" VARCHAR(120),
    "birth_date" DATE NOT NULL,
    "city" VARCHAR(120),
    "timezone" VARCHAR(80),
    "class_level" VARCHAR(120),
    "representative_type" "LegalRepresentativeType" NOT NULL,
    "verification_status" "ParentChildVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_comment" VARCHAR(1000),
    "consent_acceptance_id" UUID NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parent_child_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_child_profiles_student_id_key" ON "parent_child_profiles"("student_id");
CREATE UNIQUE INDEX "parent_child_profiles_consent_acceptance_id_key" ON "parent_child_profiles"("consent_acceptance_id");
CREATE INDEX "parent_child_profiles_parent_id_archived_at_created_at_idx" ON "parent_child_profiles"("parent_id", "archived_at", "created_at");
CREATE INDEX "parent_child_profiles_verification_status_created_at_idx" ON "parent_child_profiles"("verification_status", "created_at");

-- AddForeignKey
ALTER TABLE "parent_child_profiles" ADD CONSTRAINT "parent_child_profiles_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parent_child_profiles" ADD CONSTRAINT "parent_child_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "parent_child_profiles" ADD CONSTRAINT "parent_child_profiles_consent_acceptance_id_fkey" FOREIGN KEY ("consent_acceptance_id") REFERENCES "legal_acceptances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
