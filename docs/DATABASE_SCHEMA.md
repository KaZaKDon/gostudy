# GoStudy — описание базы данных

## 1. Общая информация

База данных проекта GoStudy расположена на хостинге.

```txt
Имя БД: vnuko1796_gostudy
Кодировка: utf8mb4
Сравнение: utf8mb4_unicode_ci
Тип таблиц: InnoDB
```

База предназначена для хранения пользователей, анкет учеников и преподавателей, предметов, заявок, связей преподаватель-ученик, уроков, домашних заданий, ответов на домашние задания, диалогов и сообщений.

---

## 2. Уже созданные таблицы

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

# 3. Таблица users

Главная таблица пользователей.

Хранит общие данные всех пользователей: учеников, преподавателей и администраторов.

## Поля

```txt
id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
role            ENUM('student', 'teacher', 'admin')
email           VARCHAR(190)
password_hash   VARCHAR(255)
full_name       VARCHAR(190)
phone           VARCHAR(50)
avatar_url      VARCHAR(255)
status          ENUM('active', 'blocked', 'deleted')
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

## Назначение полей

```txt
id              Уникальный ID пользователя
role            Роль: ученик, преподаватель или администратор
email           Email для входа
password_hash   Хэш пароля
full_name       ФИО или имя пользователя
phone           Телефон
avatar_url      Ссылка на аватар
status          Статус аккаунта
created_at      Дата создания
updated_at      Дата последнего обновления
```

## Индексы

```txt
PRIMARY KEY: id
UNIQUE: email
INDEX: role
INDEX: status
```

---

# 4. Таблица student_profiles

Анкета ученика.

Связана с таблицей `users` по `user_id`.

## Поля

```txt
id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
user_id            INT UNSIGNED
birth_year         SMALLINT UNSIGNED
class_level        VARCHAR(50)
goal               VARCHAR(255)
level_description  TEXT
parent_name        VARCHAR(190)
parent_phone       VARCHAR(50)
messenger          VARCHAR(100)
preferred_time     VARCHAR(255)
about              TEXT
created_at         TIMESTAMP
updated_at         TIMESTAMP
```

## Назначение

```txt
user_id            ID пользователя из users
birth_year         Год рождения ученика
class_level        Класс / уровень обучения
goal               Цель обучения
level_description  Описание текущего уровня
parent_name        Имя родителя
parent_phone       Телефон родителя
messenger          Предпочтительный мессенджер
preferred_time     Удобное время занятий
about              Дополнительная информация
```

## Связи

```txt
student_profiles.user_id → users.id
ON DELETE CASCADE
```

---

# 5. Таблица teacher_profiles

Анкета преподавателя.

Связана с таблицей `users` по `user_id`.

## Поля

```txt
id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
user_id               INT UNSIGNED
experience_years      TINYINT UNSIGNED
education             TEXT
certificates          TEXT
about                 TEXT
lesson_format         VARCHAR(100)
price_per_lesson      DECIMAL(10,2)
price_per_hour        DECIMAL(10,2)
schedule_description  TEXT
is_verified           TINYINT(1)
is_visible            TINYINT(1)
rating                DECIMAL(3,2)
reviews_count         INT UNSIGNED
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

## Назначение

```txt
user_id               ID пользователя из users
experience_years      Опыт работы в годах
education             Образование
certificates          Сертификаты и подтверждения
about                 О себе
lesson_format         Формат урока
price_per_lesson      Цена за урок
price_per_hour        Цена за час
schedule_description  Описание расписания
is_verified           Подтверждён ли преподаватель
is_visible            Показывать ли в каталоге
rating                Средний рейтинг
reviews_count         Количество отзывов
```

## Связи

```txt
teacher_profiles.user_id → users.id
ON DELETE CASCADE
```

---

# 6. Таблица subjects

Справочник предметов.

## Поля

```txt
id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
name        VARCHAR(120)
slug        VARCHAR(120)
is_active   TINYINT(1)
sort_order  INT UNSIGNED
```

## Назначение

```txt
name        Название предмета
slug        Системный код предмета
is_active   Активен ли предмет
sort_order  Порядок сортировки
```

## Уже добавленные предметы

```txt
Математика
Русский язык
Английский язык
Физика
Химия
Биология
История
Обществознание
Информатика
Литература
```

---

# 7. Таблица teacher_subjects

Связь преподавателей с предметами.

Один преподаватель может вести несколько предметов.

## Поля

```txt
id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
teacher_id  INT UNSIGNED
subject_id  INT UNSIGNED
```

## Связи

```txt
teacher_subjects.teacher_id → users.id
teacher_subjects.subject_id → subjects.id
```

## Уникальность

```txt
teacher_id + subject_id
```

Один и тот же предмет нельзя дважды привязать к одному преподавателю.

---

# 8. Таблица teacher_student_requests

Заявки ученика преподавателю.

Используется для логики:

```txt
Ученик отправил заявку
↓
Преподаватель увидел заявку
↓
Преподаватель принял или отклонил
```

## Поля

```txt
id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
student_id  INT UNSIGNED
teacher_id  INT UNSIGNED
subject_id  INT UNSIGNED
message     TEXT
status      ENUM('pending', 'accepted', 'rejected', 'cancelled')
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

## Статусы

```txt
pending    Ожидает решения преподавателя
accepted   Принята
rejected   Отклонена
cancelled  Отменена учеником
```

## Связи

```txt
student_id → users.id
teacher_id → users.id
subject_id → subjects.id
```

---

# 9. Таблица teacher_students

Активная связь преподавателя и ученика.

Запись появляется после принятия заявки.

## Поля

```txt
id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
teacher_id   INT UNSIGNED
student_id   INT UNSIGNED
subject_id   INT UNSIGNED
status       ENUM('active', 'archived')
started_at   TIMESTAMP
archived_at  TIMESTAMP
```

## Статусы

```txt
active    Ученик активен у преподавателя
archived  Ученик перенесён в архив
```

## Связи

```txt
teacher_id → users.id
student_id → users.id
subject_id → subjects.id
```

---

# 10. Таблица lessons

Уроки и расписание.

## Поля

```txt
id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
teacher_id        INT UNSIGNED
student_id        INT UNSIGNED
subject_id        INT UNSIGNED
title             VARCHAR(255)
lesson_date       DATETIME
duration_minutes  INT UNSIGNED
status            ENUM('scheduled', 'completed', 'cancelled', 'rescheduled')
lesson_topic      TEXT
lesson_notes      TEXT
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

## Назначение

```txt
teacher_id        Преподаватель
student_id        Ученик
subject_id        Предмет
title             Название урока
lesson_date       Дата и время урока
duration_minutes  Длительность урока
status            Статус урока
lesson_topic      Тема урока
lesson_notes      Заметки по уроку
```

## Статусы

```txt
scheduled    Запланирован
completed    Проведён
cancelled    Отменён
rescheduled  Перенесён
```

---

# 11. Таблица homework

Домашние задания.

## Поля

```txt
id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
lesson_id    INT UNSIGNED
teacher_id   INT UNSIGNED
student_id   INT UNSIGNED
title        VARCHAR(255)
description  TEXT
due_date     DATETIME
status       ENUM('active', 'completed', 'expired')
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

## Назначение

```txt
lesson_id    Урок, к которому относится ДЗ
teacher_id   Кто выдал ДЗ
student_id   Кому выдали ДЗ
title        Название ДЗ
description  Описание задания
due_date     Срок выполнения
status       Статус задания
```

## Статусы

```txt
active     Активно
completed  Выполнено
expired    Просрочено
```

---

## 12. Таблица homework_submissions

Ответы учеников на домашние задания.

Также используется как источник оценок для журнала.

## Поля

```txt
id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
homework_id      INT UNSIGNED
student_id       INT UNSIGNED
answer_text      LONGTEXT
grade            VARCHAR(20)
teacher_comment  TEXT
status           ENUM('submitted', 'checked', 'returned')
submitted_at     TIMESTAMP
```

## Назначение

```txt
homework_id      ID домашнего задания
student_id       Ученик, отправивший ответ
answer_text      Текст ответа
grade            Оценка
teacher_comment  Комментарий преподавателя
status           Статус проверки
submitted_at     Дата отправки
```

## Статусы

```txt
submitted  Отправлено на проверку
checked    Проверено
returned   Возвращено на доработку
```

## Важное решение

Отдельная таблица журнала пока не создаётся.

Журнал берёт оценки из:

```txt
homework_submissions.grade
homework_submissions.teacher_comment
homework_submissions.status
```

---

## 13. Таблица dialogs

Диалоги между преподавателем и учеником.

Один диалог создаётся для одной пары:

```txt
преподаватель ↔ ученик
```

## Поля

```txt
id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
teacher_id       INT UNSIGNED
student_id       INT UNSIGNED
last_message_at  TIMESTAMP
created_at       TIMESTAMP
```

## Уникальность

```txt
teacher_id + student_id
```

Между одной парой преподаватель-ученик не должно быть двух одинаковых диалогов.

---

## 14. Таблица messages

Сообщения внутри диалогов.

## Поля

```txt
id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
dialog_id     INT UNSIGNED
sender_id     INT UNSIGNED
message_text  LONGTEXT
is_read       TINYINT(1)
created_at    TIMESTAMP
```

## Назначение

```txt
dialog_id     ID диалога
sender_id     Автор сообщения
message_text  Текст сообщения
is_read       Прочитано ли сообщение
created_at    Дата отправки
```

---

## 15. Основная логика платформы

## Регистрация

```txt
Пользователь регистрируется
↓
Запись появляется в users
↓
В зависимости от роли создаётся запись:
student_profiles
или
teacher_profiles
```

## Заявка ученика преподавателю

```txt
Ученик выбирает преподавателя
↓
Отправляет заявку
↓
Создаётся запись в teacher_student_requests со статусом pending
```

## Принятие заявки

```txt
Преподаватель принимает заявку
↓
teacher_student_requests.status = accepted
↓
Создаётся запись в teacher_students
↓
Ученик появляется в разделе "Ученики"
```

## Урок

```txt
Преподаватель создаёт урок
↓
Запись появляется в lessons
↓
Ученик видит урок в расписании
↓
Преподаватель видит урок в расписании
```

## Домашнее задание

```txt
Преподаватель выдаёт ДЗ
↓
Запись появляется в homework
↓
Ученик отправляет ответ
↓
Запись появляется в homework_submissions
↓
Преподаватель проверяет
↓
Ставит оценку
↓
Оценка отображается в журнале
```

## Сообщения

```txt
Создаётся диалог между преподавателем и учеником
↓
Сообщения сохраняются в messages
↓
dialogs.last_message_at обновляется при новом сообщении
```

---

## 16. Что ещё предстоит добавить позже

Следующие блоки БД ещё не созданы:

```txt
materials
material_files
material_assignments
material_purchases

reviews

payments
payouts

teacher_documents

password_resets
user_sessions

admin_logs
```

Их лучше добавлять после подключения базового API и проверки регистрации, входа, заявок, уроков, домашних заданий и сообщений.

---

## 17. Текущий статус

```txt
БД создана: да
Ядро пользователей: готово
Анкеты: готовы
Предметы: готовы
Заявки: готовы
Связь преподаватель-ученик: готова
Уроки: готовы
Домашние задания: готовы
Оценки через ДЗ: готовы
Диалоги: готовы
Сообщения: готовы

Следующий шаг:
API авторизации и подключение фронтенда к реальной регистрации/входу
```
