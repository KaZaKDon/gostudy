-- Student requests and teacher acceptance flow.

CREATE TYPE "TeacherStudentRequestStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);

CREATE TABLE "teacher_student_requests" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "message" VARCHAR(1000),
    "status" "TeacherStudentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_student_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_student_requests_different_users_check"
        CHECK ("teacher_id" <> "student_id")
);

CREATE UNIQUE INDEX "teacher_student_requests_teacher_id_student_id_subject_id_key"
    ON "teacher_student_requests"("teacher_id", "student_id", "subject_id");
CREATE INDEX "teacher_student_requests_teacher_id_status_created_at_idx"
    ON "teacher_student_requests"("teacher_id", "status", "created_at");
CREATE INDEX "teacher_student_requests_student_id_status_created_at_idx"
    ON "teacher_student_requests"("student_id", "status", "created_at");

ALTER TABLE "teacher_student_requests" ADD CONSTRAINT "teacher_student_requests_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_student_requests" ADD CONSTRAINT "teacher_student_requests_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_student_requests" ADD CONSTRAINT "teacher_student_requests_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
