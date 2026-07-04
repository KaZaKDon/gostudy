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

const verificationOptions = [
    { value: '', label: 'Любая проверка' },
    { value: 'draft', label: 'Черновик' },
    { value: 'pending', label: 'На проверке' },
    { value: 'approved', label: 'Одобрен' },
    { value: 'rejected', label: 'На доработку' },
];

const visibleOptions = [
    { value: '', label: 'Любая видимость' },
    { value: '1', label: 'Показывается' },
    { value: '0', label: 'Скрыт' },
];

export function TeachersToolbar({
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
                placeholder="ФИО, email, телефон, город"
            />

            <Select
                label="Статус"
                name="status"
                value={filters.status}
                onChange={handleChange}
                options={statusOptions}
            />

            <Select
                label="Проверка"
                name="verification_status"
                value={filters.verification_status}
                onChange={handleChange}
                options={verificationOptions}
            />

            <Select
                label="Видимость"
                name="is_visible"
                value={filters.is_visible}
                onChange={handleChange}
                options={visibleOptions}
            />
        </Toolbar>
    );
}