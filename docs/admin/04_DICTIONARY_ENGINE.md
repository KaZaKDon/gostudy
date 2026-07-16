# GoStudy Admin — движок справочников

## 1. Назначение

Движок справочников предназначен для управления повторяющимися административными сущностями:

- группами предметов;
- предметами;
- группами направлений подготовки;
- направлениями подготовки;
- категориями учеников;
- будущими системными справочниками.

Главная задача движка — исключить дублирование одинаковой CRUD-логики во фронтенде, сохранив отдельные API для каждой сущности.

---

## 2. Основные принципы

### 2.1. Отдельный API для каждой сущности

API не объединяется в один универсальный endpoint.

Каждая сущность сохраняет собственную серверную логику:

```text
api/admin/dictionaries/subject-groups/
api/admin/dictionaries/subjects/
api/admin/dictionaries/preparation-groups/
api/admin/dictionaries/preparations/
api/admin/dictionaries/subject-preparations/
api/admin/dictionaries/age-groups/

Это необходимо, потому что у разных справочников отличаются:

правила удаления;
связи с другими таблицами;
проверка использования;
проверки дубликатов;
дополнительные поля;
права доступа.

Универсальность реализуется только на уровне общих PHP-помощников и React-компонентов.

3. Серверная архитектура
3.1. Общие PHP-файлы
api/admin/shared/
├── require-admin.php
├── require-moderator.php
├── request.php
├── response.php
└── validation.php
3.2. Ответственность файлов
require-admin.php
запуск административной сессии;
получение текущего пользователя;
проверка статуса аккаунта;
разрешение доступа только администратору.
require-moderator.php
разрешение доступа администратору и модератору.
request.php
проверка HTTP-метода;
чтение JSON;
получение строковых, числовых и логических query-параметров.
response.php
единый JSON-ответ;
успешный ответ;
ошибка;
404;
409;
validation.php
проверка положительного ID;
проверка названия;
проверка slug;
проверка порядка сортировки;
проверка логического значения.
4. Стандарт API справочника

Обычный CRUD-справочник содержит:

index.php
create.php
update.php
delete.php
index.php

Назначение:

получение списка;
поиск;
фильтрация;
сортировка;
подсчёт связанных записей.

Доступ:

admin
moderator
create.php

Назначение:

проверка входных данных;
проверка дубликатов;
создание записи.

Доступ:

admin
update.php

Назначение:

проверка существования записи;
проверка дубликатов;
редактирование;
включение и отключение;
изменение порядка;
перенос в другую группу, если сущность поддерживает группы.

Доступ:

admin
delete.php

Назначение:

проверка существования;
проверка связей;
запрет удаления используемых записей;
физическое удаление только неиспользуемой записи.

Доступ:

admin
5. Правила удаления

Используемые записи физически не удаляются.

Вместо удаления администратор отключает запись:

is_active = 0

Примеры:

группу предметов нельзя удалить, если в ней есть предметы;
предмет нельзя удалить, если он связан с направлениями или преподавателями;
направление нельзя удалить, если оно связано с предметами или преподавателями;
категорию учеников нельзя удалить, если её выбрали преподаватели.

Удалить можно только запись, которая не используется ни одной связующей таблицей.

6. Клиентская архитектура
6.1. Общий сервис API
src/admin/services/dictionariesApi.js

Сервис содержит методы всех справочников:

dictionariesApi.getSubjectGroups()
dictionariesApi.createSubjectGroup()
dictionariesApi.updateSubjectGroup()
dictionariesApi.deleteSubjectGroup()

dictionariesApi.getSubjects()
dictionariesApi.createSubject()
dictionariesApi.updateSubject()
dictionariesApi.deleteSubject()

dictionariesApi.getPreparationGroups()
dictionariesApi.createPreparationGroup()
dictionariesApi.updatePreparationGroup()
dictionariesApi.deletePreparationGroup()

dictionariesApi.getPreparations()
dictionariesApi.createPreparation()
dictionariesApi.updatePreparation()
dictionariesApi.deletePreparation()

dictionariesApi.getAgeGroups()
dictionariesApi.createAgeGroup()
dictionariesApi.updateAgeGroup()
dictionariesApi.deleteAgeGroup()

Все запросы:

используют credentials: 'include';
ожидают JSON;
выбрасывают ошибку при некорректном ответе;
не содержат UI-логики.
7. Структура React-движка
src/admin/components/dictionaries/
├── DictionaryPage.jsx
├── DictionaryToolbar.jsx
├── DictionaryTable.jsx
├── DictionaryModal.jsx
├── DictionaryField.jsx
└── hooks/
    └── useDictionaryCrud.js
7.1. DictionaryPage.jsx

Главный универсальный компонент.

Отвечает за:

загрузку данных;
отображение заголовка;
фильтры;
таблицу;
открытие формы;
создание;
редактирование;
включение и отключение;
удаление;
состояния загрузки;
ошибки;
пустое состояние.

Компонент получает конфигурацию сущности и не содержит названий конкретных таблиц.

7.2. DictionaryToolbar.jsx

Отвечает за:

поиск;
фильтр по группе;
фильтр по статусу;
сброс фильтров;
обновление;
кнопку создания.

Показываются только фильтры, указанные в конфигурации страницы.

7.3. DictionaryTable.jsx

Отвечает за:

формирование колонок;
вывод строк;
статус;
количество связей;
кнопки действий;
блокировку удаления.

Конкретные колонки передаются через конфигурацию.

7.4. DictionaryModal.jsx

Универсальная форма создания и редактирования.

Поля строятся по конфигурации:

text
slug
number
select
checkbox
textarea

Модальное окно не синхронизирует локальное состояние через useEffect.

При каждом открытии компонент монтируется заново с уникальным key.

7.5. DictionaryField.jsx

Отрисовывает одно поле по его типу.

Пример конфигурации:

{
    name: 'name',
    type: 'text',
    label: 'Название',
    required: true,
    maxLength: 150,
}
7.6. useDictionaryCrud.js

Отвечает за:

загрузку списка;
обновление списка;
создание;
редактирование;
переключение активности;
удаление;
состояния isLoading, isSaving;
идентификатор изменяемой записи;
ошибки страницы;
ошибки формы.

Хук не содержит сведений о конкретной сущности.

8. Конфигурация справочника

Каждая административная страница содержит только конфигурацию.

Пример группы предметов:

const subjectGroupsConfig = {
    title: 'Группы предметов',
    description:
        'Управление разделами справочника предметов.',

    entityName: 'группа предметов',
    entityNamePlural: 'группы предметов',

    api: {
        getList: dictionariesApi.getSubjectGroups,
        create: dictionariesApi.createSubjectGroup,
        update: dictionariesApi.updateSubjectGroup,
        delete: dictionariesApi.deleteSubjectGroup,
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            label: 'Название группы',
            required: true,
            maxLength: 150,
        },
        {
            name: 'slug',
            type: 'slug',
            label: 'Slug',
            required: true,
            maxLength: 150,
        },
        {
            name: 'sort_order',
            type: 'number',
            label: 'Порядок вывода',
            defaultValue: 0,
            min: 0,
        },
        {
            name: 'is_active',
            type: 'checkbox',
            label: 'Группа активна',
            defaultValue: true,
        },
    ],

    columns: [
        {
            key: 'name',
            label: 'Группа',
        },
        {
            key: 'slug',
            label: 'Slug',
        },
        {
            key: 'subjects_total',
            label: 'Предметы',
            align: 'center',
        },
        {
            key: 'sort_order',
            label: 'Порядок',
            align: 'center',
        },
        {
            key: 'is_active',
            label: 'Статус',
            type: 'status',
            align: 'center',
        },
    ],

    canDelete(item) {
        return item.subjects_total === 0;
    },

    getDeleteBlockedMessage() {
        return 'Нельзя удалить группу, пока в ней есть предметы.';
    },
};
9. Типы полей
text

Обычное текстовое поле.

slug

Поле системного идентификатора.

Правила:

строчные латинские буквы
цифры
дефисы

Slug не создаётся автоматически из русского названия без отдельной библиотеки транслитерации.

number

Числовое поле.

Используется для:

sort_order
select

Выбор связанной сущности.

Пример:

предмет → группа предметов
направление → группа направлений
checkbox

Логическое поле.

Пример:

is_active
textarea

Многострочное поле для будущих справочников, если оно действительно потребуется.

10. Страницы справочников

После создания движка страницы располагаются в:

src/admin/pages/Dictionaries/
├── SubjectGroups/
│   └── SubjectGroupsPage.jsx
├── Subjects/
│   └── SubjectsPage.jsx
├── PreparationGroups/
│   └── PreparationGroupsPage.jsx
├── Preparations/
│   └── PreparationsPage.jsx
└── AgeGroups/
    └── AgeGroupsPage.jsx

Страница должна содержать только:

конфигурацию;
вызов DictionaryPage;
дополнительные рендереры, если сущность имеет уникальные колонки.
11. Исключения

Универсальный движок применяется только там, где CRUD действительно одинаков.

Отдельные интерфейсы остаются для:

настройки связей subject_preparations;
проверки документов преподавателей;
пользователей;
учеников;
преподавателей;
финансов;
жалоб;
отзывов;
журнала действий.

Связь предметов с направлениями не является обычным CRUD-справочником.

Для неё будет отдельный модуль:

SubjectPreparationLinksPage

с выбором предмета и чекбоксами направлений.

12. Порядок внедрения
Этап 1

Создать универсальные компоненты:

DictionaryPage
DictionaryToolbar
DictionaryTable
DictionaryModal
DictionaryField
useDictionaryCrud
Этап 2

Перевести на движок:

Группы предметов
Предметы

После переноса повторно проверить весь ранее работающий CRUD.

Этап 3

Добавить через конфигурации:

Группы направлений подготовки
Направления подготовки
Категории учеников
Этап 4

Создать отдельный интерфейс связей:

Предмет → направления подготовки
Этап 5

Подключить справочники к анкете преподавателя.

13. Требования к изменениям файлов

При разработке GoStudy:

каждый новый файл предоставляется полностью;
каждый изменяемый файл предоставляется полностью;
фрагментарные вставки не используются;
перед изменением центральных файлов берётся их актуальная версия;
существующие маршруты не удаляются;
новые пункты меню добавляются только вместе с рабочим маршрутом;
временные решения не создаются.
14. Итоговая цель

После реализации нового справочника разработчику потребуется:

создать отдельный серверный API;
добавить методы в dictionariesApi.js;
описать поля и колонки конфигурацией;
подключить маршрут и пункт меню.

Копирование больших CRUD-страниц и модальных окон больше не допускается.