# GoStudy / «Пошли учиться» — структура проекта

# Корень
- `index.html` — HTML-точка входа, SEO, favicon, manifest, Open Graph.
- `package.json` — команды Vite: `dev`, `build`, `preview`, `lint`.
- `vite.config.js` — базовая конфигурация React + Vite.
- `eslint.config.js` — конфигурация ESLint.

## `src`
- `src/main.jsx` — подключение React-приложения.
- `src/app/App.jsx` — главная сборка страницы, состояние активного модального окна.
- `src/app/App.css` — стили главного экрана и фона стола.
- `src/styles/global.css` — CSS-переменные, светлая и тёмная темы, базовые стили.
- `src/data/homeBlocks.js` — данные четырёх кликабельных блоков: О платформе, Ученикам, Учителям, Тарифы.
- `src/components/Header/` — шапка, логотип, кнопки входа и регистрации.
- `src/components/DesktopScene/` — сцена рабочего стола и декоративные предметы.
- `src/components/DeskItem/` — отдельный кликабельный предмет на столе.
- `src/components/InfoModal/` — модальное окно по клику на предмет.
- `src/components/Footer/` — нижняя строка футера.

## `public/images/home`
Ожидаемые изображения главной страницы:
- `desk-background.svg` — фон деревянного стола. Позже можно заменить на `desk-background.webp` и поправить путь в `src/app/App.css`.
- `item-brochure.svg` — брошюра «О платформе».
- `item-student-notebook.svg` — тетрадь «Ученикам».
- `item-teacher-journal.svg` — классный журнал «Учителям».
- `item-pricing-book.svg` — квитанционная книжка «Тарифы».
- `decor-cup.svg` — чашка кофе.
- `decor-pencil.svg` — карандаш.
- `decor-notebook.svg` — блокнот/очки.

## `public/images/branding`
- `logo-gostudy.svg` — логотип GoStudy: GS с пером и подписью.

## `public/favicon`
- Полный favicon pack из переданного архива: `favicon.ico`, PNG-иконки, `apple-touch-icon.png`, `site.webmanifest`.

## `docs`
- `PROJECT_STRUCTURE.md` — этот файл.
- `docs/tz/` — исходные md-файлы ТЗ по платформе, ученику, учителю, тарифам и экранам.

## Новые страницы

### `src/pages/ProfileStart/`

Страница первоначального заполнения анкеты после регистрации.

Файлы:

* `ProfileStart.jsx`

  * определяет роль через query-параметр
  * показывает нужную форму

* `ProfileStart.css`

  * стили страницы анкеты

* `TeacherProfileForm.jsx`

  * форма преподавателя
  * переход в кабинет преподавателя

* `StudentProfileForm.jsx`

  * форма ученика
  * переход в кабинет ученика

Маршруты:

```text
/profile-start?role=teacher
/profile-start?role=student
```

---

## Кабинет

### `src/pages/Account/`

Главный рабочий кабинет платформы.

Файлы:

### `Account.jsx`

Главная страница кабинета.

Отвечает за:

* определение роли пользователя
* отображение сайдбара
* отображение активного раздела

---

### `Account.css`

Основные стили кабинета.

Содержит:

* сетку кабинета
* стили сайдбара
* стили рабочей области
* стили статистики
* стили тёмной темы кабинета

---

## Компоненты кабинета

### `src/pages/Account/components/AccountSidebar.jsx`

Левый сайдбар.

Отвечает за:

* фото пользователя
* имя пользователя
* роль пользователя
* навигацию по разделам кабинета

---

### `src/pages/Account/components/AccountPanel.jsx`

Правая рабочая область.

Отвечает за:

* отображение активного раздела
* статистику
* вывод содержимого разделов

---

### `src/pages/Account/components/AccountThemeSwitcher.jsx`

Переключатель темы.

Отвечает за:

* переключение светлой темы
* переключение тёмной темы
* сохранение темы в localStorage

---

## Данные кабинета

### `src/pages/Account/data/accountNavigation.js`

Навигация кабинетов.

Содержит:

### STUDENT_NAVIGATION

Разделы ученика:

* Расписание
* Класс
* Домашние задания
* Дневник обучения
* Материалы
* Сообщения
* Оплата
* Отзывы
* Настройки

### TEACHER_NAVIGATION

Разделы преподавателя:

* Расписание
* Класс
* Домашние работы
* Журнал
* Ученики
* Материалы
* Оплаты
* Сообщения
* Отзывы
* Настройки

---

### `src/pages/Account/data/demoAccountData.js`

Временные демонстрационные данные.

Содержит:

* профиль преподавателя
* профиль ученика
* статистику преподавателя
* статистику ученика

Используется до подключения API.

---

## Планируемые файлы

Пока не созданы.

### `src/pages/Classroom/`

Будущий учебный класс.

Планируемые файлы:

* `Classroom.jsx`
* `Classroom.css`

Маршрут:

```text
/classroom
```

Назначение:

Полноценный учебный процесс внутри платформы.

---

### Будущие секции преподавателя

Папка:

```text
src/pages/Account/sections/teacher/
```

Планируются:

* TeacherScheduleSection.jsx
* TeacherClassroomSection.jsx
* TeacherHomeworkSection.jsx
* TeacherJournalSection.jsx
* TeacherStudentsSection.jsx
* TeacherMaterialsSection.jsx
* TeacherPaymentsSection.jsx
* TeacherMessagesSection.jsx
* TeacherReviewsSection.jsx
* TeacherSettingsSection.jsx

---

### Будущие секции ученика

Папка:

```text
src/pages/Account/sections/student/
```

Планируются:

* StudentScheduleSection.jsx
* StudentClassroomSection.jsx
* StudentHomeworkSection.jsx
* StudentDiarySection.jsx
* StudentMaterialsSection.jsx
* StudentMessagesSection.jsx
* StudentPaymentsSection.jsx
* StudentReviewsSection.jsx
* StudentSettingsSection.jsx
# Состояние проекта на текущий момент

## Что реализовано

### Главная страница

* Фон рабочего стола.
* Четыре интерактивных блока:

  * О платформе
  * Ученикам
  * Учителям
  * Тарифы
* Модальные окна.
* Адаптивная верстка.
* Светлая и темная темы.

---

### Авторизация

Реализованы:

* Вход.
* Регистрация.
* Восстановление пароля.
* Выбор роли:

  * ученик
  * преподаватель

---

### Анкеты

#### Анкета ученика

Маршрут:

```text
/profile-start?role=student
```

После сохранения:

```text
/account?role=student
```

#### Анкета преподавателя

Маршрут:

```text
/profile-start?role=teacher
```

После сохранения:

```text
/account?role=teacher
```

---

### Кабинеты

Реализованы:

* отдельный кабинет ученика
* отдельный кабинет преподавателя
* левый сайдбар
* рабочая область
* статистика
* переключение темы

---

### Адаптив кабинета

Реализовано:

#### Desktop

```text
> 1200px
```

Сайдбар отображается постоянно.

#### Tablet / Mobile

```text
<= 1200px
```

Сайдбар сворачивается в гамбургер.

---

### Раздел «Класс»

Полностью сверстан.

Назначение:

Отображение уроков текущего дня.

Используется табличное представление.

Для мобильных устройств таблица автоматически преобразуется в карточки строк.

Раздел отвечает на вопрос:

```text
Какие уроки у меня сегодня?
```

---

# Принятые архитектурные решения

## Расписание

Показывает:

* неделю
* будущие уроки

Назначение:

Планирование.

---

## Класс

Показывает:

* уроки текущего дня

Назначение:

Быстрый вход в урок.

---

## Classroom

Будущий отдельный модуль.

Маршрут:

```text
/classroom
```

Переход:

```text
Кабинет
→ Класс
→ Войти в класс
```

Сам модуль пока не реализуется.

Сначала наполняются кабинеты.

---

# Следующая задача

## Раздел «Ученики»

Создать первый полноценный рабочий раздел преподавателя.

Папка:

```text
src/pages/Account/sections/
```

Планируемый компонент:

```text
TeacherStudentsSection.jsx
```

Данные:

```text
src/pages/Account/data/demoAccountData.js
```

Планируемый интерфейс:

Фото | Ученик | Предмет | Следующий урок | Действие

По кнопке «Открыть» в будущем будет открываться карточка ученика:

* профиль
* журнал
* домашние задания
* материалы
* история обучения

На текущем этапе используется демо-данные без API.
