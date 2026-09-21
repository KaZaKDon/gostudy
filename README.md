# GoStudy

GoStudy — образовательная онлайн-платформа для учеников, родителей и
преподавателей.

## Текущая архитектура

- frontend: React + Vite;
- backend: Node.js + TypeScript + NestJS;
- база данных: PostgreSQL;
- ORM и миграции: Prisma;
- юридические документы: Markdown в `shared/legal`;
- локальная инфраструктура: Docker Compose.

Новая серверная часть находится в `server`. Старые PHP-файлы в `docs/api` и
`docs/admin` сохранены только как справочник для поэтапного переноса
бизнес-логики. Они не являются действующим backend и не должны размещаться на
сервере.

## Быстрый локальный запуск

Подробная инструкция находится в
[`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md).

```bash
npm ci
npm --prefix server ci
```

Для выбранного локального режима сначала создать базы `gostudy`,
`gostudy_shadow` и пользователя `gostudy_app` по инструкции
[`docs/POSTGRESQL_EXISTING_SETUP.md`](docs/POSTGRESQL_EXISTING_SETUP.md).
Создать `server/.env` на основе `server/local-postgres.env.example`, затем
выполнить:

```bash
npm run server:prisma:migrate
npm run server:dev
npm run dev
```

Docker Compose и `server/.env.example` остаются запасным изолированным
вариантом на порту `5434`.

Frontend открывается на `http://localhost:5174`, API — на
`http://localhost:3002/api/v1`, проверка API —
`http://localhost:3002/api/v1/health`. Порт `3001` оставлен локальному API
TELIRA, поэтому проекты можно запускать одновременно.

## Документация

- [`docs/README.md`](docs/README.md) — карта актуальных и архивных документов;
- [`docs/ARCHITECTURE_NODE.md`](docs/ARCHITECTURE_NODE.md) — действующая
  архитектура;
- [`docs/BACKEND_MIGRATION_STATUS.md`](docs/BACKEND_MIGRATION_STATUS.md) —
  состояние переноса PHP → NestJS;
- [`docs/SCHEDULE_API_NODE.md`](docs/SCHEDULE_API_NODE.md) — чтение расписания
  и его PostgreSQL-модель;
- [`docs/TEACHER_REQUESTS_API_NODE.md`](docs/TEACHER_REQUESTS_API_NODE.md) —
  поиск преподавателей, заявки и связи;
- [`docs/NOTIFICATIONS_API_NODE.md`](docs/NOTIFICATIONS_API_NODE.md) —
  внутренняя лента, колокольчик и счётчики;
- [`docs/MESSAGES_API_NODE.md`](docs/MESSAGES_API_NODE.md) — личные диалоги,
  вложения, непрочитанные сообщения и жалобы;
- [`docs/LEGAL_STAGE_1_IMPLEMENTATION.md`](docs/LEGAL_STAGE_1_IMPLEMENTATION.md)
  — юридические документы и фиксация согласий;
- [`README_DEPLOY.md`](README_DEPLOY.md) — будущий порядок размещения на VPS.

## Проверки

```bash
npm run lint
npm run build
npm run server:lint
npm run server:test
npm run server:build
npm --prefix server run test:modules
```

`npm --prefix server ci` автоматически генерирует Prisma Client. Отдельная
команда `npm run server:prisma:generate` остаётся доступна после изменений
Prisma-схемы.
