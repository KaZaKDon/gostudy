-- Active teacher/student/subject relations used for lesson creation.

CREATE TYPE "TeacherStudentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "teacher_students" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "status" "TeacherStudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_students_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_students_different_users_check"
        CHECK ("teacher_id" <> "student_id")
);

CREATE UNIQUE INDEX "teacher_students_teacher_id_student_id_subject_id_key"
    ON "teacher_students"("teacher_id", "student_id", "subject_id");
CREATE INDEX "teacher_students_teacher_id_status_idx"
    ON "teacher_students"("teacher_id", "status");
CREATE INDEX "teacher_students_student_id_status_idx"
    ON "teacher_students"("student_id", "status");

ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
