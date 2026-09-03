# GoStudy — локальная разработка в VS Code

## Выбранный вариант для GoStudy

Для текущей локальной разработки используется уже установленный PostgreSQL.
В нём создаются отдельные база `gostudy` и пользователь `gostudy_app`.
Базы других проектов и учётная запись администратора PostgreSQL приложением не
используются.

Подробное создание базы через pgAdmin или `psql` описано в
[`POSTGRESQL_EXISTING_SETUP.md`](POSTGRESQL_EXISTING_SETUP.md).

Docker Compose остаётся запасным изолированным вариантом и использует порт
`5434`.

## Требования

- Node.js актуальной LTS-ветки;
- npm;
- локально установленный PostgreSQL и pgAdmin либо `psql`;
- VS Code.

Docker Desktop для выбранного варианта не требуется.

## Первый запуск

В корне проекта:

```bash
npm install
npm --prefix server install
```

Создать базу и пользователя по инструкции
[`POSTGRESQL_EXISTING_SETUP.md`](POSTGRESQL_EXISTING_SETUP.md), затем создать
`server/.env` из локального шаблона:

```powershell
Copy-Item server/local-postgres.env.example server/.env
```

В `server/.env` заменить `REPLACE_WITH_LOCAL_PASSWORD` на пароль пользователя
`gostudy_app`. Этот файл никому не отправлять.

Подготовить Prisma:

```bash
npm run server:prisma:generate
npm run server:prisma:migrate
npm run server:prisma:status
```

Открыть два терминала VS Code.

Терминал 1:

```bash
npm run server:dev
```

Терминал 2:

```bash
npm run dev
```

Адреса:

- frontend: `http://localhost:5174`;
- API: `http://localhost:3002/api/v1`;
- health-check: `http://localhost:3002/api/v1/health`.

Порт `3001` зарезервирован за локальным API TELIRA. GoStudy использует `3002`,
чтобы оба проекта запускались одновременно и запросы не попадали в чужой API.

## Почта локально

Пока `SMTP_HOST`, `SMTP_USERNAME` и `SMTP_PASSWORD` не заполнены, API не
отправляет настоящее письмо. Ссылка подтверждения email безопасно выводится в
журнал локального API. Регистрация при этом завершается.

## Основные команды

```bash
npm run lint
npm run build
npm run server:lint
npm run server:test
npm run server:build
npm run server:prisma:generate
npm run server:prisma:studio
```

## Важно

- `server/.env` не отправляется в архив и репозиторий;
- папки `node_modules`, `dist`, `server/dist` и сгенерированный Prisma Client не
  переносятся вручную;
- после изменения `schema.prisma` создаётся новая именованная миграция;
- локальный `gostudy_app` использует основную базу `gostudy`, а Prisma Migrate —
  отдельную `gostudy_shadow`;
- после изменения юридического текста обновляется его версия в
  `shared/legal/manifest.json`.

## Запасной вариант: Docker

Если позднее потребуется полностью изолировать PostgreSQL, использовать
`server/.env.example` и выполнить:

```bash
docker compose up -d postgres
```

Docker создаст базу `gostudy` на `localhost:5434` автоматически.

## Проверка анкеты после обновления

После получения новых файлов один раз выполнить миграцию и перезапустить API:

```powershell
npm run server:prisma:generate
npm run server:prisma:migrate
npm run server:prisma:status
npm run server:dev
```

Действующая регистрация не удаляется. После обычного входа токен Node-сессии
используется маршрутами `GET /api/v1/profile/me` и сохранением анкет в
PostgreSQL.

Эти же команды применяют основу расписания. После миграции кабинет получает
данные через `GET /api/v1/lessons/schedule`; пока уроки не созданы, раздел
показывает корректное пустое состояние без обращений к PHP API.

Преподавателю также доступна форма «Добавить урок». Она покажет пустое
состояние, если в `teacher_students` ещё нет активной связи с учеником. Это
штатное поведение, а не ошибка API.

Поиск, заявки и принятие ученика теперь перенесены. Авторизация админки также
работает через Node API; порядок подготовки учётной записи и маршруты описаны в
[`ADMIN_AUTH_API_NODE.md`](ADMIN_AUTH_API_NODE.md). Модерация преподавателя
работает через Node API в разделе «Преподаватели» административной панели.

Раздел «Аккаунты» перенесён на Node API и требует миграцию
`20260901214500_admin_accounts`. После замены файлов выполнить:

```powershell
npm run server:prisma:generate
npm run server:prisma:migrate
npm run server:prisma:status
```

Контракт раздела и правила административных изменений описаны в
[`ADMIN_ACCOUNTS_API_NODE.md`](ADMIN_ACCOUNTS_API_NODE.md).

Журнал преподавателя и дневник ученика работают через Node API без отдельной
миграции: таблица `lesson_results` уже создаётся миграцией класса
`20260902213000_classroom`. Преподаватель может опубликовать результат только
для урока со статусом `COMPLETED`; личная заметка в ответ ученику не попадает.
Контракт описан в [`JOURNAL_API_NODE.md`](JOURNAL_API_NODE.md).

Главная панель админки получает статистику через
`GET /api/v1/admin/dashboard/stats`. Отдельная миграция базы данных не нужна;
контракт описан в
[`ADMIN_DASHBOARD_API_NODE.md`](ADMIN_DASHBOARD_API_NODE.md).

Раздел «Преподаватели» использует `/api/v1/admin/teachers`. Для него применяется
миграция `20260902160000_admin_teachers`, после чего можно проверять анкету,
возвращать её на доработку и управлять видимостью. Полный контракт описан в
[`ADMIN_TEACHERS_API_NODE.md`](ADMIN_TEACHERS_API_NODE.md).

Раздел «Ученики» использует `/api/v1/admin/students`: список, поиск и полная
карточка получают данные из PostgreSQL через NestJS. Блокировка и архивирование
используют общий маршрут аккаунтов. Для этого раздела новая миграция не нужна;
после замены файлов достаточно перезапустить backend и frontend. Контракт
описан в [`ADMIN_STUDENTS_API_NODE.md`](ADMIN_STUDENTS_API_NODE.md).

Административные справочники используют единый Node-модуль по адресу
`/api/v1/admin/dictionaries`. Новая миграция для него не нужна. После замены
файлов достаточно перезапустить backend через `npm run server:dev` и frontend.
Маршруты и ограничения удаления описаны в
[`ADMIN_DICTIONARIES_API_NODE.md`](ADMIN_DICTIONARIES_API_NODE.md).

Миграция `20260901143000_notifications` включает внутреннюю ленту,
колокольчик и счётчик ожидающих заявок. Она не создаёт задним числом
уведомления по ранее обработанным заявкам. После обновления проверять нужно
новой заявкой или назначением нового урока.

Перенос и отмена используют уже существующую таблицу
`lesson_change_requests`, поэтому отдельной миграции для них нет. После замены
файлов достаточно перезапустить Node API и frontend.

Отзывы используют миграцию `20260902200000_reviews`. После её применения
ученик может отправить один отзыв на учебную связь после первого урока со
статусом `COMPLETED`. Отзыв и ответ преподавателя публикуются только после
решения администратора или модератора в разделе `/admin/reviews`. Команды
установки и полный сценарий проверки описаны в
[`REVIEWS_API_NODE.md`](REVIEWS_API_NODE.md).

Онлайн-класс использует миграцию `20260902213000_classroom`. Локальные закрытые
материалы по умолчанию сохраняются в `server/storage/private`; каталог исключён
из репозитория. При переносе на российский VPS нужно задать абсолютный
`UPLOAD_PRIVATE_DIR` вне публичного каталога сайта и предоставить процессу Node
право записи. Полный перечень маршрутов, лимитов и проверок описан в
[`CLASSROOM_API_NODE.md`](CLASSROOM_API_NODE.md).

Домашние задания используют миграцию `20260903140000_homework` и то же
закрытое хранилище. После её применения доступны выдача задания, файлы,
последовательные попытки, проверка, отмена и интеграция с классом, журналом,
дневником и карточками пользователей. Лимиты задаются переменными
`UPLOAD_HOMEWORK_MAX_BYTES` и `UPLOAD_HOMEWORK_TOTAL_MAX_BYTES`. Полный контракт
описан в [`HOMEWORK_API_NODE.md`](HOMEWORK_API_NODE.md).

Материалы используют миграцию `20260903180000_materials` и закрытое хранилище
`UPLOAD_PRIVATE_DIR`. Отдельные лимиты задаются через
`UPLOAD_MATERIAL_MAX_BYTES` и `UPLOAD_MATERIAL_TOTAL_MAX_BYTES`. Публичные
материалы появляются в каталоге только после модерации на `/admin/materials`;
полный контракт описан в [`MATERIALS_API_NODE.md`](MATERIALS_API_NODE.md).

Сообщения используют миграцию `20260903220000_messages` и закрытое хранилище
`UPLOAD_PRIVATE_DIR/messages`. Лимиты задаются через
`UPLOAD_MESSAGE_MAX_BYTES` и `UPLOAD_MESSAGE_TOTAL_MAX_BYTES`. После миграции
доступны диалоги активных учебных связей, файлы, непрочитанные сообщения,
уведомления и очередь жалоб `/admin/messages`. Полный контракт описан в
[`MESSAGES_API_NODE.md`](MESSAGES_API_NODE.md).
