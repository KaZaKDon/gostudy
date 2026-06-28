import {
    Button,
    Input,
    Select,
    Toolbar,
} from '../../components/ui/index.js';

const roleOptions = [
    { value: '', label: 'Все роли' },
    { value: 'student', label: 'Ученик' },
    { value: 'teacher', label: 'Преподаватель' },
    { value: 'admin', label: 'Администратор' },
    { value: 'moderator', label: 'Модератор' },
];

const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активен' },
    { value: 'blocked', label: 'Заблокирован' },
    { value: 'deleted', label: 'Архив' },
];

export function AccountsToolbar({
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
                placeholder="ФИО, email или телефон"
            />

            <Select
                label="Роль"
                name="role"
                value={filters.role}
                onChange={handleChange}
                options={roleOptions}
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