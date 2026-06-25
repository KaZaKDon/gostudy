# GoStudy — План реализации проекта

## Общая информация

Проект: GoStudy

Тип проекта:

```txt
Платформа для онлайн-обучения
Ученики ↔ Преподаватели
```

Стек:

```txt
Frontend:
React
Vite

Backend:
PHP 8.2+

Database:
MySQL / MariaDB

Хостинг:
БД размещена на хостинге
Имя БД:
vnuko1796_gostudy
```

---

# Текущее состояние

## Готово

### Frontend

Готовы основные разделы:

```txt
Главная страница

Авторизация
Регистрация

Кабинет ученика
Кабинет преподавателя

Расписание
Класс
Домашние задания
Материалы
Сообщения
Отзывы
Оплаты
Настройки
```

Frontend пока работает на демо-данных.

---

### База данных

Созданы таблицы:

```txt
users
student_profiles
teacher_profiles

subjects
teacher_subjects

teacher_student_requests
teacher_students

lessons

homework
homework_submissions

dialogs
messages
```

---

### Базовый API

Созданы:

```txt
api/config/database.php

api/shared/cors.php
api/shared/response.php
api/shared/json.php

api/auth/register.php
api/auth/login.php
```

---

# Этап 1

Авторизация

Статус:

```txt
В работе
```

## Задачи

### Проверка регистрации

Проверить:

```txt
Создание пользователя

users

Создание профиля

student_profiles

или

teacher_profiles
```

---

### Проверка входа

Проверить:

```txt
Проверка email

Проверка пароля

Проверка статуса аккаунта
```

---

### Реализовать

```txt
api/profile/me.php

api/profile/update.php
```

---

# Этап 2

Подключение фронтенда к авторизации

Статус:

```txt
Не начато
```

## Задачи

Убрать демо-авторизацию.

Подключить:

```txt
RegisterPage

LoginPage

ProfileStartPage
```

к реальному API.

---

# Этап 3

Заявки ученик → преподаватель

Статус:

```txt
Не начато
```

## Реализовать

```txt
api/requests/create.php

api/requests/incoming.php

api/requests/outgoing.php

api/requests/accept.php

api/requests/reject.php

api/requests/cancel.php
```

---

## Логика

```txt
Ученик отправляет заявку
↓
teacher_student_requests
↓
Преподаватель принимает
↓
teacher_students
↓
Ученик появляется в разделе
"Мои ученики"
```

---

# Этап 4

Ученики преподавателя

Статус:

```txt
Не начато
```

## Реализовать

```txt
api/students/my.php

api/students/archive.php

api/students/restore.php
```

---

# Этап 5

Уроки и расписание

Статус:

```txt
Не начато
```

## Реализовать

```txt
api/lessons/index.php

api/lessons/create.php

api/lessons/update.php

api/lessons/cancel.php

api/lessons/complete.php
```

---

## Используемые таблицы

```txt
lessons
teacher_students
subjects
```

---

# Этап 6

Домашние задания

Статус:

```txt
Не начато
```

## Реализовать

```txt
api/homework/index.php

api/homework/create.php

api/homework/submit.php

api/homework/check.php
```

---

## Используемые таблицы

```txt
homework
homework_submissions
```

---

## Оценки

Отдельной таблицы журнала нет.

Оценки берутся из:

```txt
homework_submissions.grade
```

---

# Этап 7

Сообщения

Статус:

```txt
Не начато
```

## Реализовать

```txt
api/messages/dialogs.php

api/messages/thread.php

api/messages/send.php

api/messages/read.php
```

---

## Используемые таблицы

```txt
dialogs
messages
```

---

# Этап 8

Материалы

Статус:

```txt
Не начато
```

## Добавить таблицы

```txt
materials

material_files

material_assignments
```

---

## Реализовать

```txt
api/materials/index.php

api/materials/create.php

api/materials/update.php

api/materials/delete.php

api/materials/assign.php
```

---

# Этап 9

Отзывы

Статус:

```txt
Не начато
```

## Добавить таблицы

```txt
reviews
```

---

## Реализовать

```txt
api/reviews/index.php

api/reviews/create.php

api/reviews/my.php
```

---

# Этап 10

Платежи

Статус:

```txt
Не начато
```

## Добавить таблицы

```txt
payments

payouts
```

---

## Реализовать

```txt
api/payments/index.php

api/payments/create.php

api/payments/confirm.php
```

---

# Этап 11

Проверка преподавателей

Статус:

```txt
Не начато
```

## Добавить таблицы

```txt
teacher_documents
```

---

## Назначение

Хранение:

```txt
Дипломов

Сертификатов

Подтверждающих документов
```

---

# Этап 12

Административная панель

Статус:

```txt
Не начато
```

## Добавить таблицы

```txt
admin_logs
```

---

## Реализовать

```txt
Пользователи

Преподаватели

Отзывы

Платежи

Логи действий
```

---

# Ближайшая задача

Следующая задача после текущей остановки:

```txt
Проверить register.php

Проверить login.php

Сделать profile/me.php

Сделать profile/update.php

Подключить фронтенд авторизации
```

---

# Точка остановки

Текущее состояние:

```txt
БД создана

Основные таблицы созданы

Базовый API создан

Авторизация написана

Следующий шаг:

Проверка авторизации и подключение фронтенда к реальной БД
```
