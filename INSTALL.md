# GoStudy — отзывы

Дата комплекта: 24 июля 2026 года.

## Что реализовано

- ученик оставляет отзыв после первого завершённого урока;
- один отзыв относится к одной связи
  `ученик → преподаватель → предмет`;
- ученик может исправлять свой отзыв;
- преподаватель может публиковать и исправлять ответ;
- новые и изменённые тексты проходят модерацию;
- при повторной модерации старая опубликованная версия остаётся видимой;
- после одобрения автоматически пересчитываются
  `teacher_profiles.rating` и `teacher_profiles.reviews_count`;
- решения модератора создают уведомления;
- в публичной анкете видны только опубликованные отзывы и ответы;
- в админке работает отдельная очередь `/admin/reviews`.

## Порядок установки

### 1. Резервная копия

Перед изменением базы сохранить таблицы:

- `reviews`;
- `teacher_profiles`;
- `teacher_students`;
- `notifications`.

### 2. База данных

Один раз выполнить:

```text
DATABASE/2026-07-24_reviews.sql
```

Миграция сохраняет старые отзывы. Однозначные старые записи автоматически
связываются с `teacher_students`. Неоднозначные записи остаются
опубликованными, но получают `teacher_student_id = NULL`.

Проверка неоднозначных старых записей:

```sql
SELECT
    id,
    student_id,
    teacher_id,
    teacher_student_id,
    subject_id,
    status
FROM reviews
WHERE teacher_student_id IS NULL
ORDER BY id;
```

Если запрос пустой, ручное связывание не требуется.

### 3. API на хосте

Содержимое каталога `HOST_API` разместить поверх каталога сайта,
сохраняя структуру:

```text
HOST_API/api/shared/reviews.php
    → /api/shared/reviews.php

HOST_API/api/shared/notifications.php
    → /api/shared/notifications.php

HOST_API/api/reviews/index.php
    → /api/reviews/index.php

HOST_API/api/reviews/save.php
    → /api/reviews/save.php

HOST_API/api/reviews/reply.php
    → /api/reviews/reply.php

HOST_API/api/student/teacher.php
    → /api/student/teacher.php

HOST_API/api/admin/reviews/index.php
    → /api/admin/reviews/index.php

HOST_API/api/admin/reviews/moderate.php
    → /api/admin/reviews/moderate.php

HOST_API/api/admin/dashboard/stats.php
    → /api/admin/dashboard/stats.php
```

### 4. Локальный фронтенд

Содержимое `LOCAL_FRONTEND` скопировать в корень локального проекта,
сохраняя папки. Затем выполнить:

```bash
npm run lint
npm run build
```

## Проверка полного цикла

1. Завершить хотя бы один урок ученика с преподавателем по предмету.
2. В кабинете ученика открыть «Мои преподаватели».
3. Оставить оценку и текст не короче 20 символов.
4. В `/admin/reviews` одобрить отзыв.
5. Проверить:
   - уведомление ученика;
   - уведомление преподавателя;
   - отзыв в «Мои ученики → Отзывы»;
   - отзыв в публичной анкете;
   - новые `rating` и `reviews_count`.
6. Преподавателем отправить ответ.
7. Одобрить ответ в `/admin/reviews`.
8. Проверить ответ в кабинетах и публичной анкете.
9. Изменить уже опубликованный отзыв и убедиться, что старая версия видна
   до решения модератора.

## Важные правила

- API ставится только после миграции.
- Преподаватель не может удалить отзыв.
- Отклонение не удаляет ранее опубликованную версию.
- Причина отклонения обязательна.
- Рейтинг рассчитывается только по опубликованным оценкам.
