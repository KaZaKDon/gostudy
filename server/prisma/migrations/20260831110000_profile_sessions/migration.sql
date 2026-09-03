-- Profile questionnaires, teaching dictionaries and normalized teacher links.
-- This migration is additive: users and registrations already stored in PostgreSQL stay intact.

CREATE TYPE "TeacherVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "student_profiles"
    ADD COLUMN "first_name" VARCHAR(120),
    ADD COLUMN "last_name" VARCHAR(120),
    ADD COLUMN "city" VARCHAR(120),
    ADD COLUMN "timezone" VARCHAR(80),
    ADD COLUMN "birth_year" INTEGER,
    ADD COLUMN "class_level" VARCHAR(120),
    ADD COLUMN "subjects" TEXT,
    ADD COLUMN "goal" TEXT,
    ADD COLUMN "learning_goals" TEXT,
    ADD COLUMN "level_description" TEXT,
    ADD COLUMN "lesson_format" VARCHAR(120),
    ADD COLUMN "parent_name" VARCHAR(255),
    ADD COLUMN "parent_phone" VARCHAR(40),
    ADD COLUMN "parent_email" VARCHAR(320),
    ADD COLUMN "messenger" VARCHAR(120),
    ADD COLUMN "contact_preference" VARCHAR(120),
    ADD COLUMN "preferred_time" VARCHAR(255),
    ADD COLUMN "schedule_comment" TEXT,
    ADD COLUMN "about" TEXT,
    ADD COLUMN "profile_version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "profile_completion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "teacher_profiles"
    ADD COLUMN "first_name" VARCHAR(120),
    ADD COLUMN "last_name" VARCHAR(120),
    ADD COLUMN "slug" VARCHAR(160),
    ADD COLUMN "city" VARCHAR(120),
    ADD COLUMN "timezone" VARCHAR(80),
    ADD COLUMN "headline" VARCHAR(180),
    ADD COLUMN "experience_years" INTEGER,
    ADD COLUMN "about" TEXT,
    ADD COLUMN "teaching_method" TEXT,
    ADD COLUMN "first_lesson_description" TEXT,
    ADD COLUMN "student_gets" TEXT,
    ADD COLUMN "price_45" DECIMAL(12,2),
    ADD COLUMN "price_60" DECIMAL(12,2),
    ADD COLUMN "price_90" DECIMAL(12,2),
    ADD COLUMN "trial_lesson_enabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "pricing_comment" TEXT,
    ADD COLUMN "schedule_description" TEXT,
    ADD COLUMN "accessibility_enabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "accessibility_free_lessons" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "accessibility_discount" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "accessibility_individual" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "accessibility_slots" INTEGER,
    ADD COLUMN "accessibility_comment" TEXT,
    ADD COLUMN "intro_video_url" TEXT,
    ADD COLUMN "uses_author_materials" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "sells_author_materials" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "author_materials_description" TEXT,
    ADD COLUMN "verification_status" "TeacherVerificationStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "profile_version" INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN "profile_completion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "teacher_profiles_slug_key" ON "teacher_profiles"("slug");

CREATE TABLE "subject_groups" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "subject_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subject_groups_slug_key" ON "subject_groups"("slug");

CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");
CREATE INDEX "subjects_group_id_sort_order_idx" ON "subjects"("group_id", "sort_order");

CREATE TABLE "preparation_groups" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "preparation_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "preparation_groups_slug_key" ON "preparation_groups"("slug");

CREATE TABLE "preparations" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "preparations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "preparations_slug_key" ON "preparations"("slug");
CREATE INDEX "preparations_group_id_sort_order_idx" ON "preparations"("group_id", "sort_order");

CREATE TABLE "subject_preparations" (
    "subject_id" INTEGER NOT NULL,
    "preparation_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT "subject_preparations_pkey" PRIMARY KEY ("subject_id", "preparation_id")
);

CREATE TABLE "student_age_groups" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "student_age_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_age_groups_slug_key" ON "student_age_groups"("slug");

CREATE TABLE "teacher_subjects" (
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("teacher_id", "subject_id")
);

CREATE TABLE "teacher_subject_preparations" (
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "preparation_id" INTEGER NOT NULL,
    CONSTRAINT "teacher_subject_preparations_pkey" PRIMARY KEY ("teacher_id", "subject_id", "preparation_id")
);

CREATE TABLE "teacher_age_groups" (
    "teacher_id" INTEGER NOT NULL,
    "age_group_id" INTEGER NOT NULL,
    CONSTRAINT "teacher_age_groups_pkey" PRIMARY KEY ("teacher_id", "age_group_id")
);

CREATE TABLE "teacher_education" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "institution" VARCHAR(255) NOT NULL,
    "faculty" VARCHAR(255),
    "speciality" VARCHAR(255),
    "qualification" VARCHAR(255),
    "graduation_year" INTEGER,
    "description" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_education_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "teacher_education_teacher_id_sort_order_idx" ON "teacher_education"("teacher_id", "sort_order");

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "subject_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "preparations" ADD CONSTRAINT "preparations_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "preparation_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subject_preparations" ADD CONSTRAINT "subject_preparations_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subject_preparations" ADD CONSTRAINT "subject_preparations_preparation_id_fkey"
    FOREIGN KEY ("preparation_id") REFERENCES "preparations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_subject_preparations" ADD CONSTRAINT "teacher_subject_preparations_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_subject_preparations" ADD CONSTRAINT "teacher_subject_preparations_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_subject_preparations" ADD CONSTRAINT "teacher_subject_preparations_preparation_id_fkey"
    FOREIGN KEY ("preparation_id") REFERENCES "preparations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_age_groups" ADD CONSTRAINT "teacher_age_groups_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_age_groups" ADD CONSTRAINT "teacher_age_groups_age_group_id_fkey"
    FOREIGN KEY ("age_group_id") REFERENCES "student_age_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_education" ADD CONSTRAINT "teacher_education_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "subject_groups" ("id", "name", "slug", "sort_order") VALUES
    (1, 'Школьные предметы', 'school-subjects', 10),
    (2, 'Иностранные языки', 'foreign-languages', 20),
    (3, 'Развитие и творчество', 'development-and-arts', 30);

INSERT INTO "subjects" ("id", "group_id", "name", "slug", "sort_order") VALUES
    (1, 1, 'Математика', 'mathematics', 10),
    (2, 1, 'Русский язык', 'russian-language', 20),
    (3, 1, 'Литература', 'literature', 30),
    (4, 1, 'Физика', 'physics', 40),
    (5, 1, 'Химия', 'chemistry', 50),
    (6, 1, 'Биология', 'biology', 60),
    (7, 1, 'История', 'history', 70),
    (8, 1, 'Обществознание', 'social-studies', 80),
    (9, 1, 'География', 'geography', 90),
    (10, 1, 'Информатика', 'computer-science', 100),
    (11, 2, 'Английский язык', 'english-language', 10),
    (12, 2, 'Немецкий язык', 'german-language', 20),
    (13, 2, 'Французский язык', 'french-language', 30),
    (14, 2, 'Испанский язык', 'spanish-language', 40),
    (15, 2, 'Итальянский язык', 'italian-language', 50),
    (16, 2, 'Греческий язык', 'greek-language', 60),
    (17, 2, 'Китайский язык', 'chinese-language', 70),
    (18, 3, 'Начальная школа', 'primary-school', 10),
    (19, 3, 'Подготовка к школе', 'preschool-preparation', 20),
    (20, 3, 'Логопедические занятия', 'speech-therapy', 30),
    (21, 3, 'Музыка', 'music', 40),
    (22, 3, 'Рисование', 'drawing', 50);

INSERT INTO "preparation_groups" ("id", "name", "slug", "sort_order") VALUES
    (1, 'Цель занятий', 'lesson-goals', 10),
    (2, 'Экзамены', 'exams', 20),
    (3, 'Иностранный язык', 'language-goals', 30);

INSERT INTO "preparations" ("id", "group_id", "name", "slug", "sort_order") VALUES
    (1, 1, 'Школьная программа', 'school-program', 10),
    (2, 1, 'Повышение успеваемости', 'improve-grades', 20),
    (3, 1, 'Помощь с домашними заданиями', 'homework-help', 30),
    (4, 2, 'ВПР', 'vpr', 10),
    (5, 2, 'ОГЭ', 'oge', 20),
    (6, 2, 'ЕГЭ', 'ege', 30),
    (7, 2, 'Вступительные и вузовские экзамены', 'university-exams', 40),
    (8, 3, 'Разговорная практика', 'speaking-practice', 10),
    (9, 3, 'Грамматика', 'grammar', 20),
    (10, 3, 'Международные экзамены', 'international-exams', 30),
    (11, 3, 'Язык для переезда и путешествий', 'relocation-and-travel', 40);

INSERT INTO "subject_preparations" ("subject_id", "preparation_id", "sort_order")
SELECT s."id", p."id", p."sort_order"
FROM "subjects" s
CROSS JOIN "preparations" p
WHERE p."id" IN (1, 2, 3, 7);

INSERT INTO "subject_preparations" ("subject_id", "preparation_id", "sort_order")
SELECT s."id", p."id", p."sort_order"
FROM "subjects" s
CROSS JOIN "preparations" p
WHERE s."id" BETWEEN 1 AND 10
  AND p."id" IN (4, 5, 6);

INSERT INTO "subject_preparations" ("subject_id", "preparation_id", "sort_order")
SELECT s."id", p."id", p."sort_order"
FROM "subjects" s
CROSS JOIN "preparations" p
WHERE s."id" BETWEEN 11 AND 17
  AND p."id" IN (5, 6, 8, 9, 10, 11);

INSERT INTO "student_age_groups" ("id", "name", "slug", "sort_order") VALUES
    (1, 'Дошкольники', 'preschoolers', 10),
    (2, '1–4 классы', 'grades-1-4', 20),
    (3, '5–9 классы', 'grades-5-9', 30),
    (4, '10–11 классы', 'grades-10-11', 40),
    (5, 'Студенты', 'students', 50),
    (6, 'Взрослые', 'adults', 60);

SELECT setval(pg_get_serial_sequence('subject_groups', 'id'), (SELECT MAX("id") FROM "subject_groups"));
SELECT setval(pg_get_serial_sequence('subjects', 'id'), (SELECT MAX("id") FROM "subjects"));
SELECT setval(pg_get_serial_sequence('preparation_groups', 'id'), (SELECT MAX("id") FROM "preparation_groups"));
SELECT setval(pg_get_serial_sequence('preparations', 'id'), (SELECT MAX("id") FROM "preparations"));
SELECT setval(pg_get_serial_sequence('student_age_groups', 'id'), (SELECT MAX("id") FROM "student_age_groups"));
