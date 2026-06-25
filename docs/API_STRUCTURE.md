# GoStudy — структура PHP API

## 1. Общая структура

```txt
api/
├── auth/
│   ├── register.php
│   └── login.php
│
├── config/
│   └── database.php
│
├── shared/
│   ├── cors.php
│   ├── response.php
│   └── json.php
│
├── profile/
├── teachers/
├── students/
├── requests/
├── lessons/
├── homework/
├── messages/
├── materials/
├── reviews/
├── payments/
└── admin/
```

---

## 2. Уже начатые файлы

```txt
api/config/database.php
api/shared/cors.php
api/shared/response.php
api/shared/json.php
api/auth/register.php
api/auth/login.php
```

---

## 3. Авторизация

### POST /api/auth/register.php

Регистрация ученика или преподавателя.

Создаёт запись в:

```txt
users
student_profiles или teacher_profiles
```

### POST /api/auth/login.php

Вход пользователя.

Проверяет:

```txt
email
password
status = active
```

Возвращает данные пользователя.

---

## 4. Профиль

Будущие файлы:

```txt
api/profile/me.php
api/profile/update.php
```

### GET /api/profile/me.php

Получить текущего пользователя и его анкету.

### POST /api/profile/update.php

Обновить анкету ученика или преподавателя.

---

## 5. Преподаватели

Будущие файлы:

```txt
api/teachers/index.php
api/teachers/show.php
api/teachers/subjects.php
```

### GET /api/teachers/index.php

Список преподавателей.

Фильтры:

```txt
subject
q
price
rating
```

### GET /api/teachers/show.php?id=1

Карточка преподавателя.

---

## 6. Заявки

Будущие файлы:

```txt
api/requests/create.php
api/requests/incoming.php
api/requests/outgoing.php
api/requests/accept.php
api/requests/reject.php
api/requests/cancel.php
```

Основная логика:

```txt
Ученик отправляет заявку
↓
Преподаватель принимает или отклоняет
↓
После принятия создаётся teacher_students
```

---

## 7. Ученики преподавателя

Будущие файлы:

```txt
api/students/my.php
api/students/archive.php
api/students/restore.php
```

### GET /api/students/my.php

Список активных учеников преподавателя.

Источник:

```txt
teacher_students
users
student_profiles
subjects
```

---

## 8. Уроки

Будущие файлы:

```txt
api/lessons/index.php
api/lessons/create.php
api/lessons/update.php
api/lessons/cancel.php
api/lessons/complete.php
```

Источник:

```txt
lessons
```

---

## 9. Домашние задания

Будущие файлы:

```txt
api/homework/index.php
api/homework/create.php
api/homework/submit.php
api/homework/check.php
```

Источник:

```txt
homework
homework_submissions
```

Оценки для журнала берутся из:

```txt
homework_submissions.grade
```

---

## 10. Сообщения

Будущие файлы:

```txt
api/messages/dialogs.php
api/messages/thread.php
api/messages/send.php
api/messages/read.php
```

Источник:

```txt
dialogs
messages
```

---

## 11. Материалы

Будущие файлы:

```txt
api/materials/index.php
api/materials/create.php
api/materials/update.php
api/materials/delete.php
api/materials/assign.php
```

Таблицы будут добавлены позже.

---

## 12. Отзывы

Будущие файлы:

```txt
api/reviews/index.php
api/reviews/create.php
api/reviews/my.php
```

Таблицы будут добавлены позже.

---

## 13. Платежи

Будущие файлы:

```txt
api/payments/index.php
api/payments/create.php
api/payments/confirm.php
```

Таблицы будут добавлены позже.

---

## 14. Админка

Будущие файлы:

```txt
api/admin/users/index.php
api/admin/teachers/index.php
api/admin/teachers/verify.php
api/admin/reviews/index.php
api/admin/payments/index.php
```

Таблицы будут добавлены позже.

---

## 15. Ближайший порядок реализации

```txt
1. Проверить register.php
2. Проверить login.php
3. Сделать profile/me.php
4. Сделать profile/update.php
5. Подключить фронтенд регистрации и входа
6. Сделать заявки ученик → преподаватель
7. Сделать раздел "Ученики" преподавателя
```
