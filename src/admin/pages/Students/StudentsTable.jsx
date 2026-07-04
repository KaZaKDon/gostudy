import {
    EmptyState,
    Loader,
    Table,
} from '../../components/ui/index.js';

import { StudentsRow } from './StudentsRow.jsx';

const columns = [
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'full_name', label: 'Ученик' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Телефон' },
    { key: 'status', label: 'Статус' },
    { key: 'goal', label: 'Цель' },
    { key: 'teachers', label: 'Преподаватели' },
    { key: 'lessons', label: 'Уроки' },
    { key: 'homework', label: 'ДЗ' },
    { key: 'created_at', label: 'Регистрация' },
    { key: 'actions', label: 'Действия', width: '260px' },
];

export function StudentsTable({
    students,
    isLoading,
    isStatusUpdating,
    onOpenStudent,
    onUpdateStatus,
}) {
    if (isLoading) {
        return <Loader text="Загрузка учеников..." />;
    }

    if (students.length === 0) {
        return (
            <EmptyState
                title="Ученики не найдены"
                description="Попробуйте изменить поиск или фильтры."
            />
        );
    }

    return (
        <Table columns={columns} minWidth={1320}>
            {students.map((student) => (
                <StudentsRow
                    key={student.id}
                    student={student}
                    isStatusUpdating={isStatusUpdating}
                    onOpen={onOpenStudent}
                    onUpdateStatus={onUpdateStatus}
                />
            ))}
        </Table>
    );
}