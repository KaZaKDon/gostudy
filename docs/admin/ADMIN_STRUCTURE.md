# GoStudy Admin — структура админки

## Назначение

GoStudy Admin — отдельная административная панель внутри проекта GoStudy.

Админка не использует обычный вход сайта `/login`.

Отдельный вход:

```txt
/admin/login

После входа:

/admin/dashboard

Роли
admin

Полный доступ:

аккаунты;
ученики;
преподаватели;
документы;
отзывы;
жалобы;
финансы;
журнал действий;
настройки.
moderator

Ограниченный доступ:

просмотр аккаунтов;
проверка преподавателей;
проверка документов;
отзывы;
жалобы;
журнал своих действий.
Основное меню
Панель

Аккаунты
Ученики
Преподаватели
Документы

Отзывы
Жалобы

Финансы

Журнал действий
Настройки
Разделы
Панель

Главный экран админки.

Показывает:

всего аккаунтов;
учеников;
преподавателей;
админов;
заблокированных;
преподавателей на проверке;
новые заявки;
запланированные уроки;
домашние задания;
сообщения;
жалобы;
отзывы на проверке;
оплаты;
выплаты.

API:

api/admin/dashboard/stats.php
Аккаунты

Технический раздел по таблице:

users

Показывает:

ID;
ФИО;
email;
телефон;
роль;
статус;
дата регистрации;
последний вход.

Действия:

открыть;
заблокировать;
восстановить;
изменить роль.

API:

api/admin/users/index.php
api/admin/users/show.php
api/admin/users/update-status.php
api/admin/users/update-role.php
Ученики

Профильный раздел по таблице:

student_profiles

Показывает:

профиль ученика;
родителя;
цели обучения;
преподавателей;
уроки;
домашние задания;
оплаты.
Преподаватели

Профильный раздел по таблицам:

users
teacher_profiles
teacher_subjects
subjects

Показывает:

анкету;
предметы;
опыт;
цену урока;
статус проверки;
учеников;
отзывы;
документы.

API:

api/admin/teachers/index.php
api/admin/teachers/show.php
api/admin/teachers/verify.php
api/admin/teachers/reject.php
Документы

Раздел проверки документов преподавателей.

Таблица:

teacher_documents

API:

api/admin/teacher-documents/index.php
api/admin/teacher-documents/show.php
api/admin/teacher-documents/approve.php
api/admin/teacher-documents/reject.php
Журнал действий

Таблица:

admin_logs

API:

api/admin/logs/index.php
React структура
src/admin/
├── AdminApp.jsx
│
├── components/
│   ├── forms/
│   ├── layout/
│   ├── modal/
│   ├── table/
│   └── ui/
│
├── constants/
├── hooks/
│
├── layout/
│   └── AdminLayout.jsx
│
├── pages/
│   ├── Login/
│   ├── Dashboard/
│   ├── Accounts/
│   ├── Students/
│   ├── Teachers/
│   ├── Documents/
│   ├── Reviews/
│   ├── Reports/
│   ├── Payments/
│   ├── Logs/
│   └── Settings/
│
├── services/
│   ├── adminAuthApi.js
│   ├── dashboardApi.js
│   ├── accountsApi.js
│   ├── teachersApi.js
│   ├── documentsApi.js
│   └── logsApi.js
│
├── styles/
│   ├── admin.css
│   ├── admin-theme.css
│   ├── admin-layout.css
│   ├── admin-login.css
│   ├── admin-dashboard.css
│   ├── admin-table.css
│   ├── admin-forms.css
│   └── admin-modal.css
│
└── utils/
Роуты
/admin/login
/admin/dashboard
/admin/accounts
/admin/students
/admin/teachers
/admin/documents
/admin/reviews
/admin/reports
/admin/payments
/admin/logs
/admin/settings
CSS структура

Главный файл:

@import './admin-theme.css';

@import './admin-layout.css';
@import './admin-login.css';
@import './admin-dashboard.css';
@import './admin-table.css';
@import './admin-forms.css';
@import './admin-modal.css';
CSS переменные
:root {
    --admin-bg: #f5f6f8;
    --admin-surface: #ffffff;
    --admin-surface-soft: #f9fafb;
    --admin-surface-hover: #f1f3f5;

    --admin-sidebar: #2f343b;
    --admin-sidebar-hover: #3b4149;
    --admin-sidebar-active: #4a515b;
    --admin-sidebar-text: #f8fafc;
    --admin-sidebar-muted: #cbd5e1;

    --admin-header: #ffffff;

    --admin-text: #24292f;
    --admin-text-muted: #69707a;
    --admin-text-soft: #8a929d;

    --admin-border: #e3e6ea;
    --admin-border-strong: #cfd5dc;

    --admin-primary: #6f8f33;
    --admin-primary-hover: #5d7a2a;

    --admin-secondary: #8b5e3c;
    --admin-secondary-hover: #724b30;

    --admin-success: #43a047;
    --admin-warning: #d79b28;
    --admin-danger: #c74646;
    --admin-info: #6b7280;

    --admin-sidebar-width: 260px;
    --admin-header-height: 74px;
    --admin-page-padding: 28px;

    --admin-gap-xs: 6px;
    --admin-gap-sm: 10px;
    --admin-gap-md: 16px;
    --admin-gap-lg: 24px;
    --admin-gap-xl: 32px;

    --admin-table-row: 58px;

    --admin-shadow-soft: 0 8px 24px rgba(15, 23, 42, 0.06);
    --admin-shadow-card: 0 12px 32px rgba(15, 23, 42, 0.08);

    --admin-radius-sm: 10px;
    --admin-radius-md: 14px;
    --admin-radius-lg: 18px;
    --admin-radius-xl: 24px;

    --admin-transition: 0.2s ease;
}