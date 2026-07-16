import {
    dictionariesApi,
} from '../../services/dictionariesApi.js';

export const ageGroupsConfig = {
    entityKey: 'age-group',
    entityName: 'возрастная группа',

    eyebrow: 'Справочники',
    title: 'Возрастные группы',

    description:
        'Управление возрастными категориями, которые преподаватели выбирают в анкете.',

    createTitle:
        'Новая возрастная группа',

    editTitle:
        'Редактирование возрастной группы',

    createDescription:
        'Добавьте новую возрастную категорию для преподавателей.',

    editDescription:
        'Измените название, slug, порядок или состояние возрастной группы.',

    createButtonLabel:
        'Добавить возрастную группу',

    loadingText:
        'Загрузка возрастных групп...',

    emptyTitle:
        'Возрастных групп пока нет',

    emptyDescription:
        'Добавьте первую возрастную группу.',

    notFoundTitle:
        'Возрастные группы не найдены',

    notFoundDescription:
        'Измените параметры поиска или сбросьте фильтры.',

    showIdColumn: true,

    idColumn: {
        label: 'ID',
        width: 65,
        align: 'center',
    },

    tableMinWidth: 1100,
    actionsColumnWidth: 255,

    permissions: {
        create: true,
        update: true,
        toggle: true,
        delete: true,
    },

    api: {
        getList:
            dictionariesApi.getAgeGroups,

        create:
            dictionariesApi.createAgeGroup,

        update:
            dictionariesApi.updateAgeGroup,

        delete:
            dictionariesApi.deleteAgeGroup,
    },

    messages: {
        load:
            'Не удалось загрузить возрастные группы',

        save:
            'Не удалось сохранить возрастную группу',

        toggle:
            'Не удалось изменить состояние возрастной группы',

        delete:
            'Не удалось удалить возрастную группу',
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            label: 'Название возрастной группы',
            placeholder:
                'Например: 1–4 класс',
            required: true,
            maxLength: 120,
        },
        {
            name: 'slug',
            type: 'text',
            label: 'Slug',
            placeholder:
                'primary-school',
            helperText:
                'Только строчные латинские буквы, цифры и дефисы.',
            required: true,
            maxLength: 120,
        },
        {
            name: 'sort_order',
            type: 'number',
            label: 'Порядок вывода',
            defaultValue: 100,
            min: 0,
            step: 1,
        },
        {
            name: 'is_active',
            type: 'checkbox',
            label:
                'Возрастная группа активна и доступна преподавателям',
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
            label: 'Возрастная группа',
            strong: true,
        },
        {
            key: 'slug',
            label: 'Slug',
            type: 'code',
            width: 230,
        },
        {
            key: 'teachers_total',
            label: 'Преподавателей',
            type: 'count',
            width: 150,
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
            return 'Укажите название возрастной группы';
        }

        if (!payload.slug) {
            return 'Укажите slug возрастной группы';
        }

        if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/
                .test(payload.slug)
        ) {
            return 'Slug может содержать только строчные латинские буквы, цифры и дефисы';
        }

        return '';
    },

    transformPayload(payload) {
        return {
            ...payload,
            sort_order: Number(payload.sort_order),
            is_active: Boolean(payload.is_active),
        };
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
        return item.teachers_total === 0;
    },

    getItemLabel(item) {
        return item.name;
    },

    getDeleteConfirmMessage(item) {
        return `Удалить возрастную группу «${item.name}»?`;
    },
};