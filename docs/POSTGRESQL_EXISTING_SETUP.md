# GoStudy — отдельная база в существующем PostgreSQL

**Дата актуализации:** 31 августа 2026 года  
**Локальный режим:** существующий PostgreSQL

## Что создаём

- отдельную базу данных `gostudy`;
- отдельную техническую базу `gostudy_shadow` только для Prisma Migrate;
- отдельного непривилегированного пользователя `gostudy_app`;
- подключение приложения только к этой базе;
- таблицы через Prisma-миграции проекта.

Пользователя `postgres` нельзя указывать в `DATABASE_URL` приложения: это
администратор всего PostgreSQL, включая базы других проектов.

## Вариант 1 — pgAdmin

1. Открыть pgAdmin и подключиться к локальному серверу PostgreSQL.
2. Открыть **Tools → Query Tool** для служебной базы `postgres`.
3. Придумать отдельный длинный пароль для `gostudy_app`. Пароль не отправлять и
   не добавлять в документацию.
4. Выполнить первую команду, подставив пароль:

```sql
CREATE ROLE gostudy_app
    WITH LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    PASSWORD 'ЗАМЕНИТЬ_НА_ЛОКАЛЬНЫЙ_ПАРОЛЬ';
```

5. Выполнить создание отдельной базы:

```sql
CREATE DATABASE gostudy
    WITH OWNER = gostudy_app
    ENCODING = 'UTF8'
    TEMPLATE = template0;
```

6. Создать отдельную shadow-базу. Prisma использует её только для проверки
   истории миграций и никогда не должна подменять ею основную базу:

```sql
CREATE DATABASE gostudy_shadow
    WITH OWNER = gostudy_app
    ENCODING = 'UTF8'
    TEMPLATE = template0;
```

В pgAdmin должен быть включён обычный режим автосохранения команд. Команду
`CREATE DATABASE` нельзя выполнять внутри вручную открытой транзакции.

## Вариант 2 — psql

В PowerShell выполнить:

```powershell
psql -U postgres -h localhost -p 5432 -d postgres
```

Затем выполнить команды создания роли и двух баз из раздела выше и выйти
командой `\q`.
Если локальный PostgreSQL слушает другой порт, заменить `5432`.

## Подключение GoStudy

В корне проекта:

```powershell
Copy-Item server/local-postgres.env.example server/.env
```

Открыть `server/.env` и заменить `REPLACE_WITH_LOCAL_PASSWORD` на пароль
`gostudy_app`:

```dotenv
DATABASE_URL=postgresql://gostudy_app:REPLACE_WITH_LOCAL_PASSWORD@localhost:5432/gostudy?schema=public
SHADOW_DATABASE_URL=postgresql://gostudy_app:REPLACE_WITH_LOCAL_PASSWORD@localhost:5432/gostudy_shadow?schema=public
```

Если пароль содержит `@`, `:`, `/`, `?`, `#`, `%` или другие служебные символы
URL, их нужно URL-кодировать. Самый простой локальный вариант — длинный
уникальный пароль из латинских букв и цифр.

## Создание таблиц

После сохранения `server/.env` выполнить:

```powershell
npm run server:prisma:generate
npm run server:prisma:migrate
npm run server:prisma:status
```

Ожидаемый результат последней команды: схема базы актуальна. После этого можно
запускать API и frontend:

```powershell
npm run server:dev
npm run dev
```

## Если роль или база уже существуют

Не повторять команды создания вслепую. Проверить объекты в pgAdmin:

- **Login/Group Roles → gostudy_app**;
- **Databases → gostudy**;
- **Databases → gostudy_shadow**.

Если они уже есть, достаточно проверить владельца базы и строку
`DATABASE_URL` и `SHADOW_DATABASE_URL`. Обе строки должны указывать на разные
базы. Удалять существующую базу `gostudy` для повторного запуска миграции не
нужно: новая миграция анкеты добавляет таблицы и поля без удаления регистраций.
