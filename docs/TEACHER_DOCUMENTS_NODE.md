# Документы преподавателей в Node/PostgreSQL

## Что хранится

- В PostgreSQL находятся метаданные дипломов, сертификатов и документов о повышении квалификации.
- Файлы сохраняются в `UPLOAD_PRIVATE_DIR/teacher-documents/<teacher_id>`.
- Каталог `UPLOAD_PRIVATE_DIR` не должен находиться внутри `public`, `dist` или другого каталога, который Nginx раздаёт напрямую.
- Публичная анкета получает только сведения о подтверждённых документах. Сам файл ученику или родителю не выдаётся.

## Маршруты преподавателя

- `POST /api/v1/profile/teacher/documents` — загрузить один PDF/JPG/PNG/WebP до 10 МБ;
- `POST /api/v1/profile/teacher/documents/delete` — удалить собственный документ;
- `GET /api/v1/profile/teacher/documents/:id/file` — открыть собственный файл после авторизации.

## Маршруты модератора

- `GET /api/v1/admin/documents` — список и фильтры;
- `GET /api/v1/admin/documents/:id/file` — защищённый просмотр;
- `PATCH /api/v1/admin/documents/:id/moderation` — подтверждение или отклонение.

Все решения модератора записываются в `admin_audit_logs`. Преподавателю создаётся уведомление. Причина обязательна при отклонении.

## Перенос старых PHP-документов

Импортёр принимает JSON-массив старых строк `teacher_documents` либо объект вида `{ "documents": [...] }`. Для каждой строки нужны как минимум:

- `id`;
- `teacher_id`;
- `type`;
- `document_title`;
- `file_url` — путь относительно старого закрытого каталога.

Также поддерживаются `education_id`, `institution`, `document_year`, `original_name`, `mime_type`, `file_size`, `status`, `reject_reason`, `checked_by`, `checked_at`, `sort_order`, `created_at`, `updated_at`. Идентификатор проверившего сохраняется только тогда, когда в PostgreSQL существует администратор или модератор с тем же ID.

Перед импортом:

1. применить Prisma-миграцию;
2. выполнить `npm run prisma:generate` и `npm run build` в `server`;
3. указать `LEGACY_UPLOAD_PRIVATE_DIR` и `UPLOAD_PRIVATE_DIR`;
4. запустить `npm run documents:import-legacy -- /absolute/path/teacher-documents.json`.

Старый `id` сохраняется как `legacy_id`, поэтому повторный запуск безопасно пропускает уже перенесённые записи. Файлы копируются, а не удаляются: старое хранилище остаётся резервной копией до ручной проверки результата.
