import {
    EmptyState,
    Loader,
    Table,
} from '../../components/ui/index.js';

import { TeachersRow } from './TeachersRow.jsx';

const columns = [
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'full_name', label: 'Преподаватель' },
    { key: 'email', label: 'Email' },
    { key: 'subjects', label: 'Предметы' },
    { key: 'city', label: 'Город' },
    { key: 'status', label: 'Статус' },
    { key: 'verification', label: 'Проверка' },
    { key: 'visible', label: 'Видимость' },
    { key: 'rating', label: 'Рейтинг' },
    { key: 'students', label: 'Ученики' },
    { key: 'actions', label: 'Действия', width: '260px' },
];

export function TeachersTable({
    teachers,
    isLoading,
    isStatusUpdating,
    onOpenTeacher,
    onUpdateStatus,
}) {
    if (isLoading) {
        return <Loader text="Загрузка преподавателей..." />;
    }

    if (teachers.length === 0) {
        return (
            <EmptyState
                title="Преподаватели не найдены"
                description="Попробуйте изменить поиск или фильтры."
            />
        );
    }

    return (
        <Table columns={columns} minWidth={1480}>
            {teachers.map((teacher) => (
                <TeachersRow
                    key={teacher.id}
                    teacher={teacher}
                    isStatusUpdating={isStatusUpdating}
                    onOpen={onOpenTeacher}
                    onUpdateStatus={onUpdateStatus}
                />
            ))}
        </Table>
    );
}