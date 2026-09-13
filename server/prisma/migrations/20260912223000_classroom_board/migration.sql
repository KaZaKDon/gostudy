CREATE TABLE "lesson_board_strokes" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "width" INTEGER NOT NULL,
    "points" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_board_strokes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lesson_board_strokes_width_check" CHECK ("width" BETWEEN 1 AND 40),
    CONSTRAINT "lesson_board_strokes_points_array_check" CHECK (jsonb_typeof("points") = 'array')
);

CREATE INDEX "lesson_board_strokes_lesson_id_id_idx"
    ON "lesson_board_strokes"("lesson_id", "id");
CREATE INDEX "lesson_board_strokes_author_id_id_idx"
    ON "lesson_board_strokes"("author_id", "id");

ALTER TABLE "lesson_board_strokes"
    ADD CONSTRAINT "lesson_board_strokes_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_board_strokes"
    ADD CONSTRAINT "lesson_board_strokes_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
