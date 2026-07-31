import {
    Button,
    Input,
    Select,
    Toolbar,
} from '../../components/ui/index.js';

const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'На модерации' },
    { value: 'approved', label: 'Одобрено' },
    { value: 'rejected', label: 'Отклонено' },
];

const targetOptions = [
    { value: '', label: 'Отзывы и ответы' },
    { value: 'review', label: 'Только отзывы' },
    { value: 'reply', label: 'Только ответы' },
];

export function ReviewsToolbar({
    filters,
    onFiltersChange,
    onResetFilters,
    onRefresh,
}) {
    function handleChange(event) {
        const { name, value } = event.target;

        onFiltersChange({
            ...filters,
            [name]: value,
        });
    }

    return (
        <Toolbar
            actions={(
                <>
                    <Button variant="secondary" onClick={onResetFilters}>
                        Сбросить
                    </Button>

                    <Button variant="primary" onClick={onRefresh}>
                        Обновить
                    </Button>
                </>
            )}
        >
            <Input
                label="Поиск"
                type="search"
                name="q"
                value={filters.q}
                placeholder="ID, ученик, преподаватель, предмет"
                onChange={handleChange}
            />

            <Select
                label="Статус"
                name="status"
                value={filters.status}
                options={statusOptions}
                onChange={handleChange}
            />

            <Select
                label="Публикация"
                name="target"
                value={filters.target}
                options={targetOptions}
                onChange={handleChange}
            />
        </Toolbar>
    );
}
