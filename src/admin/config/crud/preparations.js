import {
    dictionariesApi,
} from '../../services/dictionariesApi.js';

function getGroups(context) {
    return context.dependencies?.groups ?? [];
}

export const preparationsConfig = {
    entityKey: 'preparation',
    entityName: 'направление подготовки',

    eyebrow: 'Справочники',
    title: 'Направления подготовки',

    description:
        'Управление учебными целями, экзаменами, олимпиадами и другими направлениями работы преподавателей.',

    createTitle:
        'Новое направление подготовки',

    editTitle:
        'Редактирование направления подготовки',

    createDescription:
        'Добавьте новое направление в одну из существующих групп.',

    editDescription:
        'Измените группу, название, slug, порядок или состояние направления.',

    createButtonLabel:
        'Добавить направление',

    loadingText:
        'Загрузка направлений подготовки...',

    emptyTitle:
        'Направлений подготовки пока нет',

    emptyDescription:
        'Добавьте первое направление подготовки.',

    notFoundTitle:
        'Направления не найдены',

    notFoundDescription:
        'Измените параметры поиска или сбросьте фильтры.',

    showIdColumn: true,

    idColumn: {
        label: 'ID',
        width: 65,
        align: 'center',
    },

    tableMinWidth: 1280,
    actionsColumnWidth: 255,

    permissions: {
        create: true,
        update: true,
        toggle: true,
        delete: true,
    },

    api: {
        getList:
            dictionariesApi.getPreparations,

        create:
            dictionariesApi.createPreparation,

        update:
            dictionariesApi.updatePreparation,

        delete:
            dictionariesApi.deletePreparation,
    },

    async loadDependencies() {
        const response =
            await dictionariesApi.getPreparationGroups();

        if (!response?.success) {
            throw new Error(
                response?.message
                || 'Не удалось загрузить группы направлений подготовки',
            );
        }

        return {
            groups: response.data?.items ?? [],
        };
    },

    disableCreate(context) {
        return getGroups(context).length === 0;
    },

    messages: {
        load:
            'Не удалось загрузить направления подготовки',

        save:
            'Не удалось сохранить направление подготовки',

        toggle:
            'Не удалось изменить состояние направления подготовки',

        delete:
            'Не удалось удалить направление подготовки',
    },

    fields(context) {
        const groups = getGroups(context);

        return [
            {
                name: 'group_id',
                type: 'select',
                label:
                    'Группа направлений подготовки',
                placeholder:
                    'Выберите группу',
                required: true,

                defaultValue:
                    groups.find(
                        (group) => group.is_active,
                    )?.id
                    ?? groups[0]?.id
                    ?? '',

                options: groups.map((group) => ({
                    value: String(group.id),

                    label: group.is_active
                        ? group.name
                        : `${group.name} — отключена`,
                })),
            },
            {
                name: 'name',
                type: 'text',
                label:
                    'Название направления',
                placeholder:
                    'Например: Подготовка к ЕГЭ',
                required: true,
                maxLength: 150,
            },
            {
                name: 'slug',
                type: 'text',
                label: 'Slug',
                placeholder:
                    'ege-preparation',
                helperText:
                    'Только строчные латинские буквы, цифры и дефисы.',
                required: true,
                maxLength: 150,
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
                    'Направление активно и доступно для использования',
                defaultValue: true,
            },
        ];
    },

    filters: [
        {
            name: 'search',
            type: 'search',
            label: 'Поиск',
            placeholder:
                'Название, slug или группа',
            defaultValue: '',
            searchFields: [
                'name',
                'slug',
                'group_name',
            ],
        },
        {
            name: 'group_id',
            type: 'select',
            label: 'Группа',
            defaultValue: '',

            options(context) {
                return [
                    {
                        value: '',
                        label: 'Все группы',
                    },

                    ...getGroups(context).map(
                        (group) => ({
                            value: String(group.id),
                            label: group.name,
                        }),
                    ),
                ];
            },
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
            label: 'Направление',
            strong: true,
        },
        {
            key: 'slug',
            label: 'Slug',
            type: 'code',
            width: 230,
        },
        {
            key: 'group_name',
            label: 'Группа',
            width: 250,
        },
        {
            key: 'subjects_total',
            label: 'Предметов',
            type: 'count',
            width: 115,
            align: 'center',
        },
        {
            key: 'teachers_total',
            label: 'Преподавателей',
            type: 'count',
            width: 140,
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
            activeLabel: 'Активно',
            inactiveLabel: 'Отключено',
            width: 120,
            align: 'center',
        },
    ],

    validate(payload) {
        if (!payload.group_id) {
            return 'Выберите группу направлений подготовки';
        }

        if (!payload.name) {
            return 'Укажите название направления';
        }

        if (!payload.slug) {
            return 'Укажите slug направления';
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
            group_id: Number(payload.group_id),
            sort_order: Number(payload.sort_order),
            is_active: Boolean(payload.is_active),
        };
    },

    buildTogglePayload(item) {
        return {
            id: item.id,
            group_id: item.group_id,
            name: item.name,
            slug: item.slug,
            sort_order: item.sort_order,
            is_active: !item.is_active,
        };
    },

    canDelete(item) {
        return (
            item.subjects_total === 0
            && item.teachers_total === 0
        );
    },

    getItemLabel(item) {
        return item.name;
    },

    getDeleteConfirmMessage(item) {
        return `Удалить направление «${item.name}»?`;
    },
};