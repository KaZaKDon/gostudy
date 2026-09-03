import { Button, Input, Select, Toolbar } from '../../components/ui/index.js';

const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'На модерации' },
    { value: 'approved', label: 'Опубликовано' },
    { value: 'rejected', label: 'Отклонено' },
    { value: 'hidden', label: 'Скрыто' },
    { value: 'private', label: 'Личное' },
];

export function MaterialsToolbar({ filters, onChange, onReset, onRefresh }) {
    return (
        <Toolbar actions={<><Button variant="secondary" onClick={onReset}>Сбросить</Button><Button variant="primary" onClick={onRefresh}>Обновить</Button></>}>
            <Input
                label="Поиск"
                type="search"
                value={filters.q}
                placeholder="ID, название, автор, предмет"
                onChange={(event) => onChange({ ...filters, q: event.target.value })}
            />
            <Select
                label="Статус"
                value={filters.status}
                options={statusOptions}
                onChange={(event) => onChange({ ...filters, status: event.target.value })}
            />
        </Toolbar>
    );
}
