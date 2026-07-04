import {
    Button,
    Input,
    Select,
    Toolbar,
} from '../../components/ui/index.js';

const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активен' },
    { value: 'blocked', label: 'Заблокирован' },
    { value: 'deleted', label: 'Архив' },
];

export function StudentsToolbar({
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
                onChange={handleChange}
                placeholder="ФИО, email, телефон, родитель"
            />

            <Select
                label="Статус"
                name="status"
                value={filters.status}
                onChange={handleChange}
                options={statusOptions}
            />
        </Toolbar>
    );
}