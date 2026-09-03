# GoStudy — действующая архитектура Node.js

**Редакция:** 1.5  
**Дата:** 3 сентября 2026 года  
**Статус:** актуальный архитектурный документ

## 1. Решение

GoStudy разрабатывается как React-приложение с отдельным модульным API на
Node.js, TypeScript и NestJS. База данных — PostgreSQL, доступ к ней и миграции
выполняются через Prisma.

Старый процедурный PHP-backend не развёртывается. Его исходники в `docs`
используются только как карта существующей бизнес-логики.

## 2. Главные принципы

1. Максимальная модульность.
2. Один модуль отвечает за одну предметную область.
3. Контроллеры не содержат бизнес-логику.
4. Доступ к базе выполняется через сервисы и Prisma.
5. Входные данные проверяются DTO до выполнения бизнес-операции.
6. Критические действия выполняются транзакционно.
7. Frontend не является доверенным источником ролей, цен, версий документов и
   результатов оплат.
8. Все изменения схемы оформляются миграциями.
9. Документация обновляется в том же этапе, что и код.
10. Модуль считается перенесённым только после сборки и тестов.

## 3. Структура

```text
gostudy-main/
├── src/                         React frontend
├── server/
│   ├── prisma/                  схема и миграции PostgreSQL
│   └── src/
│       ├── common/              инфраструктурные модули
│       ├── generated/           Prisma Client, не хранится в архиве
│       └── modules/             предметные модули NestJS
├── shared/
│   └── legal/                   общие юридические тексты и manifest
└── docs/                        актуальная и архивная документация
```

## 4. Планируемые предметные модули

```text
auth
users
legal-consents
parents
students
teachers
subjects
teacher-search
requests
schedule
lessons
classroom
journal
messages
homework
materials
reviews
notifications
files
tariffs
subscriptions
payments
admin
```

Модули не обращаются к внутренним файлам друг друга напрямую. Общие контракты
экспортируются через публичные сервисы или отдельный пакет контрактов.

## 5. API

Новые маршруты используют префикс `/api/v1`. Имена `.php` в URL не
сохраняются.

Пример:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
GET  /api/v1/profile/me
GET  /api/v1/profile/teacher-options
POST /api/v1/profile/teacher
GET  /api/v1/profile/student
POST /api/v1/profile/student
GET  /api/v1/lessons/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /api/v1/lessons/options
POST /api/v1/lessons
POST /api/v1/lessons/change-requests
POST /api/v1/lessons/change-requests/respond
POST /api/v1/lessons/change-requests/withdraw
GET  /api/v1/teachers
GET  /api/v1/teachers/details?teacher_id=ID
POST /api/v1/teachers/requests
GET  /api/v1/teacher/students
POST /api/v1/teacher/student-requests/respond
POST /api/v1/teacher/students/status
GET  /api/v1/teacher/student-details?relation_id=ID&tab=overview
GET  /api/v1/student/teachers
GET  /api/v1/classroom/show?lesson_id=ID
POST /api/v1/classroom/sync
POST /api/v1/classroom/start
POST /api/v1/classroom/finish
POST /api/v1/classroom/send-message
POST /api/v1/classroom/save-note
POST /api/v1/classroom/upload-file
GET  /api/v1/classroom/download-file?file_id=ID
GET  /api/v1/journal
POST /api/v1/journal/result
GET  /api/v1/student/diary
GET  /api/v1/homework
GET  /api/v1/homework/show?id=ID
GET  /api/v1/homework/options
POST /api/v1/homework
POST /api/v1/homework/submit
POST /api/v1/homework/review
POST /api/v1/homework/cancel
GET  /api/v1/homework/download?type=assignment&id=ID
GET  /api/v1/materials?view=mine|catalog|assigned
GET  /api/v1/materials/options
POST /api/v1/materials
POST /api/v1/materials/:id/assign
POST /api/v1/materials/:id/report
GET  /api/v1/materials/download?item_id=ID
GET  /api/v1/messages/dialogs
GET  /api/v1/messages/thread
POST /api/v1/messages/send
POST /api/v1/messages/read
POST /api/v1/messages/report
GET  /api/v1/messages/download?attachment_id=ID
GET  /api/v1/admin/messages/reports
GET  /api/v1/admin/messages/reports/:id
PATCH /api/v1/admin/messages/reports/:id
POST /api/v1/profile/teacher/visibility
GET  /api/v1/notifications
POST /api/v1/notifications/read
POST /api/v1/notifications/delete
POST /api/v1/notifications/clear
GET  /api/v1/health
```

До переноса всех модулей frontend не переключается целиком на новый API.
Переключение выполняется по завершённым группам функций.

## 6. Авторизация

- пароль хранится только как стойкий хеш;
- открытые токены email и сеансов не сохраняются;
- в базе хранится SHA-256 токена;
- срок подтверждения email — 24 часа;
- срок сеанса по умолчанию — 30 дней;
- роль и статус пользователя определяет только сервер;
- IP и User-Agent используются для журнала безопасности и согласий.

Защищённые маршруты принимают `X-Auth-Token` (действующий контракт React) либо
стандартный `Authorization: Bearer`. В PostgreSQL хранится только SHA-256
токена. PHP-сеансы с Node-токенами не смешиваются.

## 7. Анкеты и справочники

- ученик и преподаватель получают профиль через защищённый Node API;
- сохранение основной анкеты, связанных предметов, направлений, возрастов и
  образования выполняется одной транзакцией;
- справочники нормализованы в PostgreSQL и имеют стабильные ID;
- новая миграция только расширяет базу и не удаляет существующие регистрации;
- файлы преподавателя остаются отдельным следующим этапом модуля `files`.

## 8. Юридические документы

Manifest, тексты галочек и Markdown-файлы находятся в `shared/legal` и
одновременно используются frontend и backend.

При регистрации API:

1. требует два обязательных решения;
2. не доверяет переданным браузером версиям и текстам;
3. берёт действующие документы из серверного manifest;
4. вычисляет SHA-256 каждого Markdown-файла;
5. сохраняет текст галочки, результат, документы, версии, хеши, IP, User-Agent
   и время;
6. отдельно сохраняет добровольное рекламное решение, включая отказ.

## 9. Расписание

- время уроков хранится в PostgreSQL как `timestamptz`;
- границы периода рассчитываются по часовому поясу анкеты пользователя;
- маршрут расписания сам ограничивает данные текущим учеником или
  преподавателем;
- frontend включает чтение расписания отдельно от создания, переноса,
  онлайн-класса и других ещё не перенесённых операций.
- урок может назначить только преподаватель и только ученику из активной связи
  по конкретному предмету;
- разрешённая продолжительность и цена повторно проверяются по анкете на
  сервере;
- сервер отклоняет пересекающиеся уроки преподавателя или ученика.
- перенос и отмена будущего урока выполняются через предложение одного
  участника и обязательный ответ второго;
- автор может отозвать ожидающее предложение, а при подтверждении переноса
  сервер повторно проверяет конфликты расписания.

## 10. Real-time

Внутренняя лента уведомлений на первом этапе использует REST API с опросом
каждые 15 секунд, при фокусе окна и после локальных действий. Заявка ученика,
ответ преподавателя, назначение урока и новое личное сообщение создают
уведомления транзакционно вместе с основной операцией. Счётчик ожидающих заявок
считается по самим заявкам, а не по наличию уведомлений.

Личные сообщения работают через REST: список опрашивается раз в 10 секунд,
открытый диалог — раз в 5 секунд. WebSocket подключается внутри модулей
сообщений и класса после стабилизации базовой логики. При росте нагрузки
очереди и общий транспорт событий подключаются через Redis.

Администратор не имеет штатного маршрута для произвольного просмотра личных
диалогов. Он получает только обжалованное сообщение и ограниченный контекст;
каждое открытие фиксируется в журнале действий.

## 11. Локальная и производственная среда

Для текущей локальной разработки в уже установленном PostgreSQL используются
отдельная база `gostudy` и непривилегированный пользователь `gostudy_app`.
Для локальных команд Prisma Migrate создаётся отдельная база
`gostudy_shadow`; она не используется приложением.
Docker Compose на порту `5434` сохраняется как изолированный запасной вариант.
Секреты находятся только в `server/.env`, который исключён из проекта.

На VPS React отдаёт Nginx, а `/api/v1` проксируется на NestJS. PostgreSQL и
пользовательские файлы размещаются на российской инфраструктуре.
