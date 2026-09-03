# Документация GoStudy

Дата актуализации: 3 сентября 2026 года.

## Действующие документы

| Документ | Назначение |
| --- | --- |
| `ARCHITECTURE_NODE.md` | Актуальная архитектура Node.js/NestJS |
| `PROFILE_API_NODE.md` | Единые PostgreSQL-сеансы и Node-маршруты анкет |
| `SCHEDULE_API_NODE.md` | PostgreSQL-модель и Node-маршрут расписания |
| `CLASSROOM_API_NODE.md` | Онлайн-класс, завершение урока, чат и закрытые материалы |
| `JOURNAL_API_NODE.md` | Журнал преподавателя и дневник ученика |
| `HOMEWORK_API_NODE.md` | Полный цикл домашних заданий и закрытых файлов |
| `MATERIALS_API_NODE.md` | Личная библиотека, каталог, назначения, модерация и будущие продажи |
| `TEACHER_REQUESTS_API_NODE.md` | Поиск преподавателей, заявки и учебные связи |
| `NOTIFICATIONS_API_NODE.md` | Внутренняя лента, колокольчик и счётчики |
| `MESSAGES_API_NODE.md` | Личные диалоги, вложения, родительская модель и жалобы |
| `MESSAGES_PATCH_INSTALL.md` | Установка и ручная проверка этапа сообщений |
| `REVIEWS_API_NODE.md` | Отзывы, ответы, модерация и рейтинг преподавателя |
| `ADMIN_DICTIONARIES_API_NODE.md` | Справочники и связи предметов в админке |
| `LOCAL_DEVELOPMENT.md` | Локальный запуск frontend, API и PostgreSQL |
| `POSTGRESQL_EXISTING_SETUP.md` | Создание отдельной базы `gostudy` в установленном PostgreSQL |
| `BACKEND_MIGRATION_STATUS.md` | Карта переноса функций PHP → NestJS |
| `LEGAL_STAGE_1_IMPLEMENTATION.md` | Юридические страницы и фиксация согласий |
| `GOSTUDY_LEGAL_DOCUMENTS_SITE_INTEGRATION.md` | Полная модель юридических документов |
| `PROJECT_CONCEPT.md` | Продуктовая концепция платформы |
| `SEO_INSTALL.md` | SEO frontend |

## Архивная PHP-документация

Следующие материалы сохраняются как технический справочник и источник
бизнес-правил, но больше не описывают действующий backend:

- `docs/api/**/*.php.md`;
- `docs/admin/**/*.php.md`;
- `10_MAIL_CODE.md`;
- `11_AUTH_CODE.md`;
- старые `*_INSTALL.md`, если в них указаны PHP-файлы или MySQL;
- SQL из `docs/database/migrations`;
- файлы `HOST_API`.
- `docs-legacy-php.zip` — неизменённая архивная копия прежнего комплекта.

Архивный код нельзя копировать на VPS. При переносе очередного модуля сначала
изучаются его PHP-обработчики и SQL, затем функциональность реализуется внутри
отдельного NestJS-модуля, покрывается тестами и отмечается в
`BACKEND_MIGRATION_STATUS.md`.

## Источник истины

- код backend: `server/src`;
- схема базы: `server/prisma/schema.prisma`;
- миграции: `server/prisma/migrations`;
- тексты и версии юридических документов: `shared/legal`;
- frontend: `src`;
- состояние миграции: `docs/BACKEND_MIGRATION_STATUS.md`.
