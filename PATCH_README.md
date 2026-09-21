# GoStudy — security dependencies patch 2026-09-20

Патч накладывается поверх `gostudy-main-audited-2026-09-20` с сохранением
структуры папок. Он содержит только изменённые и новые файлы.

## Что исправлено

Frontend:

- `pdfjs-dist` 6.2.108 — исправление выполнения JavaScript из вредоносного PDF;
- `react-router-dom` 7.18.4 — исправление CSRF в RSC mode;
- безопасные версии `nanoid` 3.3.18 и `postcss` 8.5.28;
- обновлены безопасные транзитивные build-зависимости.

Backend:

- `@nestjs/config` 4.0.4 и `lodash` 4.18.1;
- `nodemailer` 9.1.1 и типы 8.0.2;
- `multer` 2.4.0;
- `deepmerge-ts` 8.0.2;
- `mysql2` 3.24.4;
- `vitest` 5.0.1.

NestJS остаётся на 11.2.3, Prisma — на 7.10.0. Перехода на новые major-версии
runtime-фреймворков и отката Prisma нет.

## Применение

1. Остановить локальные frontend и backend процессы.
2. Распаковать архив в корень проекта с заменой файлов.
3. Выполнить из корня проекта:

```bash
npm ci
npm --prefix server ci
npm audit
npm --prefix server audit
```

4. Контрольные команды:

```bash
npm run lint
npm run build
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run test:modules
```

Патч не содержит миграций Prisma и не изменяет базу данных. После его установки
можно продолжить ранее запланированный отдельный шаг применения миграции
`20260920133000_student_notification_settings_node`.

## Проверка патча

- чистая установка frontend и backend: успешно;
- полный `npm audit`: 0 уязвимостей в обоих проектах;
- frontend lint/build: успешно;
- backend TypeScript/NestJS build: успешно;
- backend: 53 test-файла, 213/213 тестов;
- NestJS DI-граф: OK.
