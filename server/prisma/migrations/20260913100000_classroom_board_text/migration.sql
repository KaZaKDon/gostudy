CREATE TABLE "lesson_board_texts" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "lesson_board_texts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lesson_board_texts_lesson_id_id_idx" ON "lesson_board_texts"("lesson_id", "id");
CREATE INDEX "lesson_board_texts_author_id_id_idx" ON "lesson_board_texts"("author_id", "id");

ALTER TABLE "lesson_board_texts" ADD CONSTRAINT "lesson_board_texts_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_board_texts" ADD CONSTRAINT "lesson_board_texts_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
