# GoStudy: конфигурация Vitest без предупреждения ESM/CommonJS

Дата: 23 сентября 2026 года.

## Что изменено

Файл `server/vitest.config.ts` переведён на CommonJS-синтаксис, соответствующий
модульному режиму NestJS-сервера. Настройки и состав тестов не изменялись.

Это устраняет предупреждение Vitest о ESM-синтаксисе в конфигурации,
загружаемой как CommonJS, без перевода всего backend на ESM.

## Установка

1. Остановите API сочетанием `Ctrl+C`.
2. Распакуйте архив в `E:\Project\gostudy` с заменой файлов.
3. Из корня проекта выполните:

```powershell
npm run server:test
npm run server:lint
npm --prefix server run test:modules
```

Тесты должны запускаться без прежнего сообщения:

```text
Your Vite config uses features that are unsupported by configLoader: 'native'
```
