import {
    EmptyState,
    Loader,
    Table,
} from '../../components/ui/index.js';

import { AccountsRow } from './AccountsRow.jsx';

const columns = [
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'full_name', label: 'ФИО' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Телефон' },
    { key: 'role', label: 'Роль' },
    { key: 'status', label: 'Статус' },
    { key: 'last_login_at', label: 'Последний вход' },
    { key: 'created_at', label: 'Регистрация' },
    { key: 'actions', label: 'Действия', width: '120px' },
];

export function AccountsTable({ accounts, isLoading, onOpenAccount }) {
    if (isLoading) {
        return <Loader text="Загрузка аккаунтов..." />;
    }

    if (accounts.length === 0) {
        return (
            <EmptyState
                title="Аккаунты не найдены"
                description="Попробуйте изменить поиск или фильтры."
            />
        );
    }

    return (
        <Table columns={columns} minWidth={1080}>
            {accounts.map((account) => (
                <AccountsRow
                    key={account.id}
                    account={account}
                    onOpen={onOpenAccount}
                />
            ))}
        </Table>
    );
}