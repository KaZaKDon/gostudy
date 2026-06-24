# GoStudy — структура проекта

## Основной стек

Frontend:

* React
* Vite
* React Router

Backend (планируется):

* PHP
* MySQL

---

## Структура src

### app

```txt
src/app
```

Основная конфигурация приложения.

Содержит:

* App.jsx
* router.jsx

---

### pages

```txt
src/pages
```

Страницы проекта.

Основные:

```txt
Home/
Login/
Register/
PasswordReset/
ProfileStart/
Account/
Classroom/
Legal/
NotFound/
```

---

### components

```txt
src/components
```

Переиспользуемые компоненты.

Примеры:

```txt
PasswordField/
Footer/
Header/
Modal/
```

---

### data

```txt
src/data
```

Статические данные.

Основные файлы:

```txt
legal/
demoAccountData.js
```

---

## Кабинет

### Account

```txt
src/pages/Account
```

Главная точка кабинетов.

Основные части:

```txt
components/
data/
sections/
```

---

### sections

```txt
src/pages/Account/sections
```

Все разделы кабинета.

Примеры:

```txt
Schedule
Classroom
Homework
Journal
Students
Materials
Messages
Payments
Reviews
Settings
```

---

### Classroom

```txt
src/pages/Classroom
```

Страница проведения урока.

Основные компоненты:

```txt
ClassroomPage
ClassroomHeader
ClassroomWorkspace
ClassroomChat
ClassroomHomework
ClassroomNotes
ClassroomFinishModal
```

---

## Юридические документы

```txt
src/data/legal
```

Основной файл:

```txt
legalDocuments.js
```

Содержит:

* agreement
* privacy
* rules

---

## Стили

Основной файл:

```txt
src/styles/global.css
```

Здесь находятся:

* переменные;
* светлая тема;
* тёмная тема;
* общие цвета;
* размеры;
* тени;
* радиусы.

Все новые компоненты обязаны использовать переменные из global.css.

---

## Папка public

Изображения:

```txt
public/images
```

Фавиконки:

```txt
public/favicon
```

SEO:

```txt
public/robots.txt
public/sitemap.php
```

404:

```txt
public/images/not-found
```

---

## Правила разработки

1. Приоритет — модульность.
2. Один компонент — одна ответственность.
3. Стили рядом с компонентом.
4. Общие переменные только через global.css.
5. Все изменяемые файлы выводятся полностью.
6. Если информации недостаточно — запросить файл.
