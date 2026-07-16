import {
    dictionariesApi,
} from '../../services/dictionariesApi.js';

export const subjectGroupsConfig = {
    entityKey: 'subject-group',
    entityName: 'группа предметов',

    eyebrow: 'Справочники',
    title: 'Группы предметов',

    description:
        'Управление разделами, в которых размещаются предметы преподавателей.',

    createTitle:
        'Новая группа предметов',

    editTitle:
        'Редактирование группы предметов',

    createDescription:
        'Создайте новую группу для объединения предметов.',

    editDescription:
        'Измените название, системный slug, порядок или состояние группы.',

    createButtonLabel:
        'Добавить группу',

    loadingText:
        'Загрузка групп предметов...',

    emptyTitle:
        'Групп предметов пока нет',

    emptyDescription:
        'Создайте первую группу, чтобы затем добавить в неё предметы.',

    notFoundTitle:
        'Группы не найдены',

    notFoundDescription:
        'Измените параметры поиска или сбросьте фильтры.',

    showIdColumn: true,

    idColumn: {
        label: 'ID',
        width: 65,
        align: 'center',
    },

    tableMinWidth: 1120,
    actionsColumnWidth: 255,

    permissions: {
        create: true,
        update: true,
        toggle: true,
        delete: true,
    },

    api: {
        getList:
            dictionariesApi.getSubjectGroups,

        create:
            dictionariesApi.createSubjectGroup,

        update:
            dictionariesApi.updateSubjectGroup,

        delete:
            dictionariesApi.deleteSubjectGroup,
    },

    messages: {
        load:
            'Не удалось загрузить группы предметов',

        save:
            'Не удалось сохранить группу предметов',

        toggle:
            'Не удалось изменить состояние группы предметов',

        delete:
            'Не удалось удалить группу предметов',
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            label: 'Название группы',
            placeholder:
                'Например: Иностранные языки',
            required: true,
            maxLength: 150,
        },
        {
            name: 'slug',
            type: 'text',
            label: 'Slug',
            placeholder:
                'foreign-languages',
            helperText:
                'Только строчные латинские буквы, цифры и дефисы.',
            required: true,
            maxLength: 150,
        },
        {
            name: 'sort_order',
            type: 'number',
            label: 'Порядок вывода',
            defaultValue: 0,
            min: 0,
            step: 1,
        },
        {
            name: 'is_active',
            type: 'checkbox',
            label:
                'Группа активна и доступна для использования',
            defaultValue: true,
        },
    ],

    filters: [
        {
            name: 'search',
            type: 'search',
            label: 'Поиск',
            placeholder:
                'Название или slug',
            defaultValue: '',
            searchFields: [
                'name',
                'slug',
            ],
        },
        {
            name: 'status',
            type: 'status',
            label: 'Статус',
            defaultValue: 'all',
            options: [
                {
                    value: 'all',
                    label: 'Все статусы',
                },
                {
                    value: 'active',
                    label: 'Только активные',
                },
                {
                    value: 'inactive',
                    label: 'Только отключённые',
                },
            ],
        },
    ],

    columns: [
        {
            key: 'name',
            label: 'Группа',
            strong: true,
        },
        {
            key: 'slug',
            label: 'Slug',
            type: 'code',
            width: 220,
        },
        {
            key: 'subjects_total',
            label: 'Предметов',
            type: 'count',
            width: 115,
            align: 'center',
        },
        {
            key: 'active_subjects_total',
            label: 'Активных',
            type: 'count',
            width: 115,
            align: 'center',
        },
        {
            key: 'sort_order',
            label: 'Порядок',
            width: 100,
            align: 'center',
        },
        {
            key: 'is_active',
            label: 'Статус',
            type: 'status',
            activeLabel: 'Активна',
            inactiveLabel: 'Отключена',
            width: 120,
            align: 'center',
        },
    ],

    validate(payload) {
        if (!payload.name) {
            return 'Укажите название группы';
        }

        if (!payload.slug) {
            return 'Укажите slug группы';
        }

        if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/
                .test(payload.slug)
        ) {
            return 'Slug может содержать только строчные латинские буквы, цифры и дефисы';
        }

        return '';
    },

    buildTogglePayload(item) {
        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            sort_order: item.sort_order,
            is_active: !item.is_active,
        };
    },

    canDelete(item) {
        return item.subjects_total === 0;
    },

    getItemLabel(item) {
        return item.name;
    },

    getDeleteConfirmMessage(item) {
        return `Удалить группу «${item.name}»?`;
    },
};