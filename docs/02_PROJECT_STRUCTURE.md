# GoStudy — Структура проекта

## Основные страницы

src/pages

```text
Account/
Auth/
Home/
```

---

## Кабинет

```text
src/pages/Account
```

Главный файл:

```text
Account.jsx
```

Отвечает за:

* роль пользователя
* переключение разделов
* состояние кабинета
* передачу данных в панели

---

## Панель кабинета

```text
src/pages/Account/components
```

### AccountPanel.jsx

Отображение активного раздела.

### AccountSidebar.jsx

Левое меню кабинета.

---

## Навигация

```text
src/pages/Account/data/accountNavigation.js
```

Хранит меню ученика и преподавателя.

---

## Демо-данные

```text
src/pages/Account/data/demoAccountData.js
```

Содержит:

* профили
* расписание
* сообщения
* отзывы
* оплаты
* учеников
* преподавателей

---

## Раздел Расписание

```text
sections/Schedule
```

Файлы:

```text
ScheduleSection.jsx
components/
```

---

## Раздел Ученики

```text
sections/TeacherStudents
```

Основные файлы:

```text
TeacherStudentsSection.jsx
TeacherStudentsSection.css
```

Компоненты:

```text
TeacherStudentProfile.jsx
TeacherStudentTabContent.jsx
TeacherStudentsSidebar.jsx
```

---

## Раздел Мои преподаватели

```text
sections/Reviews
```

Основные файлы:

```text
ReviewsSection.jsx
ReviewsSection.css
```

Компоненты:

```text
StudentReviews.jsx
TeacherReviews.jsx
StudentTeacherReviewCard.jsx
ReviewModal.jsx
```

---

## Раздел Сообщения

```text
sections/Messages
```

Отвечает за:

* ученик ↔ преподаватель
* родитель ↔ преподаватель

---

## Поиск преподавателей

```text
sections/FindTeacher
```

Файлы:

```text
FindTeacherSection.jsx
FindTeacherSection.css
demoTeachers.js
```

Компоненты:

```text
TeacherSearchFilters.jsx
TeacherSearchList.jsx
TeacherSearchRow.jsx
TeacherProfileModal.jsx
```

---

## Настройки

```text
sections/Settings
```

Настройки профиля преподавателя и ученика.

---

## Материалы

```text
sections/Materials
```

Учебники, тренажеры, дополнительные материалы.

---

## Домашние задания

```text
sections/Homework
```

---

## Журнал

```text
sections/Journal
```

Только преподаватель.

---

## Дневник

```text
sections/Diary
```

Только ученик.

---

## Оплаты

```text
sections/Payments
```

Ученик и преподаватель.
