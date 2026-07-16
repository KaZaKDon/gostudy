import {
    dictionariesApi,
} from '../../services/dictionariesApi.js';

export const preparationGroupsConfig = {
    entityKey: 'preparation-group',
    entityName: 'группа направлений подготовки',

    eyebrow: 'Справочники',
    title: 'Группы направлений подготовки',

    description:
        'Управление разделами, в которых объединяются направления подготовки преподавателей.',

    createTitle:
        'Новая группа направлений',

    editTitle:
        'Редактирование группы направлений',

    createDescription:
        'Создайте новую группу для объединения направлений подготовки.',

    editDescription:
        'Измените название, slug, порядок или состояние группы.',

    createButtonLabel:
        'Добавить группу',

    loadingText:
        'Загрузка групп направлений...',

    emptyTitle:
        'Групп направлений пока нет',

    emptyDescription:
        'Создайте первую группу направлений подготовки.',

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

    tableMinWidth: 1160,
    actionsColumnWidth: 255,

    permissions: {
        create: true,
        update: true,
        toggle: true,
        delete: true,
    },

    api: {
        getList:
            dictionariesApi.getPreparationGroups,

        create:
            dictionariesApi.createPreparationGroup,

        update:
            dictionariesApi.updatePreparationGroup,

        delete:
            dictionariesApi.deletePreparationGroup,
    },

    messages: {
        load:
            'Не удалось загрузить группы направлений подготовки',

        save:
            'Не удалось сохранить группу направлений подготовки',

        toggle:
            'Не удалось изменить состояние группы направлений подготовки',

        delete:
            'Не удалось удалить группу направлений подготовки',
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            label: 'Название группы',
            placeholder:
                'Например: Международные языковые экзамены',
            required: true,
            maxLength: 150,
        },
        {
            name: 'slug',
            type: 'text',
            label: 'Slug',
            placeholder:
                'international-language-exams',
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
            width: 250,
        },
        {
            key: 'preparations_total',
            label: 'Направлений',
            type: 'count',
            width: 130,
            align: 'center',
        },
        {
            key: 'active_preparations_total',
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
        return item.preparations_total === 0;
    },

    getItemLabel(item) {
        return item.name;
    },

    getDeleteConfirmMessage(item) {
        return `Удалить группу «${item.name}»?`;
    },
};