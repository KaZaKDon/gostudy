import {
    dictionariesApi,
} from '../../services/dictionariesApi.js';

function getGroups(context) {
    return context.dependencies?.groups ?? [];
}

export const subjectsConfig = {
    entityKey: 'subject',
    entityName: 'предмет',

    eyebrow: 'Справочники',
    title: 'Предметы',

    description:
        'Управление предметами и их распределением по группам.',

    createTitle:
        'Новый предмет',

    editTitle:
        'Редактирование предмета',

    createDescription:
        'Добавьте новый предмет в одну из существующих групп.',

    editDescription:
        'Измените группу, название, slug, порядок или состояние предмета.',

    createButtonLabel:
        'Добавить предмет',

    loadingText:
        'Загрузка предметов...',

    emptyTitle:
        'Предметов пока нет',

    emptyDescription:
        'Добавьте первый предмет в справочник.',

    notFoundTitle:
        'Предметы не найдены',

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
            dictionariesApi.getSubjects,

        create:
            dictionariesApi.createSubject,

        update:
            dictionariesApi.updateSubject,

        delete:
            dictionariesApi.deleteSubject,
    },

    async loadDependencies() {
        const response =
            await dictionariesApi.getSubjectGroups();

        if (!response?.success) {
            throw new Error(
                response?.message
                || 'Не удалось загрузить группы предметов',
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
            'Не удалось загрузить предметы',

        save:
            'Не удалось сохранить предмет',

        toggle:
            'Не удалось изменить состояние предмета',

        delete:
            'Не удалось удалить предмет',
    },

    fields(context) {
        const groups = getGroups(context);

        return [
            {
                name: 'group_id',
                type: 'select',
                label: 'Группа предметов',
                placeholder: 'Выберите группу',
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
                label: 'Название предмета',
                placeholder:
                    'Например: Китайский язык',
                required: true,
                maxLength: 120,
            },
            {
                name: 'slug',
                type: 'text',
                label: 'Slug',
                placeholder:
                    'chinese-language',
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
                    'Предмет активен и доступен преподавателям',
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
            label: 'Предмет',
            strong: true,
        },
        {
            key: 'slug',
            label: 'Slug',
            type: 'code',
            width: 190,
        },
        {
            key: 'group_name',
            label: 'Группа',
            width: 220,
        },
        {
            key: 'preparations_total',
            label: 'Направлений',
            type: 'count',
            width: 125,
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
            activeLabel: 'Активен',
            inactiveLabel: 'Отключён',
            width: 120,
            align: 'center',
        },
    ],

    validate(payload) {
        if (!payload.group_id) {
            return 'Выберите группу предметов';
        }

        if (!payload.name) {
            return 'Укажите название предмета';
        }

        if (!payload.slug) {
            return 'Укажите slug предмета';
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
            item.preparations_total === 0
            && item.teachers_total === 0
            && item.teacher_preparations_total === 0
        );
    },

    getItemLabel(item) {
        return item.name;
    },

    getDeleteConfirmMessage(item) {
        return `Удалить предмет «${item.name}»?`;
    },
};