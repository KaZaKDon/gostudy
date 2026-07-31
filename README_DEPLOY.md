# GoStudy — загрузка фото, документов и видеовизитки

Все файлы в пакете даны полностью. Файл `docs/.../name.php.md` соответствует
файлу `name.php` в такой же папке на хосте.

## 1. Дополнить корневой `.env` на хосте

```dotenv
UPLOAD_PUBLIC_DIR=/var/www/vnuko1796/data/www/gostudyonline.ru/uploads
UPLOAD_PUBLIC_URL=https://gostudyonline.ru/uploads
UPLOAD_PRIVATE_DIR=/var/www/vnuko1796/data/www/gostudy-private
UPLOAD_PHOTO_MAX_BYTES=5242880
UPLOAD_DOCUMENT_MAX_BYTES=10485760
UPLOAD_VIDEO_MAX_BYTES=104857600
```

`gostudy-private` находится рядом с папкой сайта, а не внутри неё. Поэтому
дипломы и сертификаты нельзя открыть по прямому URL.

## 2. Настроить PHP

Содержимое `docs/server/.user.ini.md` поместить в корневой файл сайта `.user.ini`:

`/var/www/vnuko1796/data/www/gostudyonline.ru/.user.ini`

PHP может применять изменения `.user.ini` до пяти минут. Если Nginx возвращает
`413 Request Entity Too Large` раньше PHP, в панели хостинга нужно увеличить
`client_max_body_size` минимум до `105M` либо обратиться в поддержку хостинга.

Для проверки MIME требуется стандартное расширение PHP `fileinfo`.

## 3. Подготовить хранилища

Создать папки:

- `/var/www/vnuko1796/data/www/gostudyonline.ru/uploads`, права `755`;
- `/var/www/vnuko1796/data/www/gostudy-private`, права `750`.

Содержимое `docs/uploads/.htaccess.md` поместить в:

`/var/www/vnuko1796/data/www/gostudyonline.ru/uploads/.htaccess`

PHP также создаёт внутренние папки преподавателей автоматически.

## 4. Выполнить миграции

Если основная миграция анкеты ещё не выполнялась:

1. `docs/database/migrations/2026-07-17_teacher_profile_teaching.sql`;
2. `docs/database/migrations/2026-07-17_teacher_profile_uploads.sql`.

Если первая уже выполнена, запустить только вторую. Она добавляет в
`teacher_documents` поля `mime_type` и `file_size`.

## 5. Обновить PHP

Новые публичные API:

- `/api/profile/upload-photo.php`;
- `/api/profile/upload-video.php`;
- `/api/profile/delete-media.php`;
- `/api/profile/upload-document.php`;
- `/api/profile/delete-document.php`;
- `/api/shared/upload.php`.

Новый административный API:

- `/api/admin/teacher-documents/download.php`.

Обязательно обновить также `me.php`, `teacher-options.php`, `update-teacher.php`
и перечисленные в пакете административные файлы. Прямые ссылки на документы
больше не возвращаются клиенту.

## 6. Обновить фронтенд

Скопировать полные файлы из `src`, выполнить:

```bash
npm run lint
npm run build
```

## 7. Проверка

1. Фото JPG/PNG/WebP загружается кликом и сразу отображается.
2. Замена фото удаляет предыдущий локальный файл.
3. Диплом PDF появляется в списке со статусом «На проверке».
4. Файл документа нельзя открыть по прямому URL.
5. Модератор скачивает документ из карточки преподавателя.
6. MP4/WebM загружается с прогрессом и открывается в проигрывателе.
7. Ввод произвольных ссылок для фото и видео отсутствует.
8. Файлы неподдерживаемого формата и превышающие лимит отклоняются.

Документы принимаются только как PDF, JPG, PNG и WebP до 10 МБ. Фото — до
5 МБ и минимум 300 × 300 пикселей. Видео — MP4 или WebM до 100 МБ. API отдаёт
фронтенду фактический лимит с учётом настроек PHP.