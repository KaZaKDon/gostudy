# Фото и видеовизитки преподавателей в Node/PostgreSQL

## Новая схема

- Файлы хранятся в `UPLOAD_PRIVATE_DIR/teacher-profile-media/<teacher_id>`.
- Преподаватель может загрузить новую фотографию или видеовизитку, открыть её и удалить до публикации.
- Новая загрузка получает статус `PENDING` и не заменяет уже опубликованный файл.
- Администратор или модератор проверяет файл в `/admin/profile-media`.
- Только после подтверждения ссылка на новый файл становится публичной. Предыдущая версия получает статус `REPLACED`.
- При отклонении преподаватель получает уведомление с причиной, а предыдущая публичная версия остаётся без изменений.

## Ограничения

- фотография: JPG, PNG или WebP, до 5 МБ, минимум 300 × 300 пикселей;
- видеовизитка: MP4 или WebM, до 100 МБ;
- расширение, MIME-тип и сигнатура файла проверяются сервером.

## Маршруты

Преподаватель:

- `POST /api/v1/profile/teacher/media/photo`;
- `POST /api/v1/profile/teacher/media/video`;
- `POST /api/v1/profile/teacher/media/delete`;
- `GET /api/v1/profile/teacher/media/:id/file`.

Модератор:

- `GET /api/v1/admin/profile-media`;
- `GET /api/v1/admin/profile-media/:id/file`;
- `PATCH /api/v1/admin/profile-media/:id/moderation`.

Публичная выдача:

- `GET /api/v1/teachers/profile-media/:id` — только подтверждённый файл; для видео поддерживаются Range-запросы.

## Перенос старых PHP-файлов

Импортёр принимает JSON-массив или объект `{ "media": [] }`. Для строки обязательны `id`, `teacher_id`, `type` (`photo` или `video`) и `file_url` относительно старого закрытого каталога. Поддерживаются `original_name`, `status`, `reject_reason`, `checked_at`, `published_at`, `created_at`, `updated_at`.

После применения миграции и сборки сервера:

```powershell
$env:LEGACY_UPLOAD_PRIVATE_DIR="E:\путь\к\старому\хранилищу"
$env:UPLOAD_PRIVATE_DIR="E:\Project\gostudy\server\storage\private"
npm run profile-media:import-legacy -- "E:\путь\teacher-profile-media.json"
```

Импорт копирует файлы, не удаляя оригиналы. `legacy_id` делает повторный запуск безопасным.
