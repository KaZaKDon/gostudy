import { Pagination } from '../../components/ui/index.js';
import { useAccounts } from '../../hooks/useAccounts.js';

import { AccountsTable } from './AccountsTable.jsx';
import { AccountsToolbar } from './AccountsToolbar.jsx';
import { AccountsViewModal } from './AccountsViewModal.jsx';

import './accounts.css';

export function AccountsPage() {
    const {
        accounts,
        filters,
        pagination,
        selectedAccount,

        isLoading,
        isAccountLoading,
        isStatusUpdating,

        error,
        accountError,

        updateFilters,
        resetFilters,
        changePage,
        refresh,

        openAccount,
        closeAccount,
        updateAccountStatus,

        isRoleUpdating,
        updateAccountRole,
    } = useAccounts();

    return (
        <div className="admin-page accounts-page">
            <AccountsToolbar
                filters={filters}
                onFiltersChange={updateFilters}
                onResetFilters={resetFilters}
                onRefresh={refresh}
            />

            {error && (
                <div className="admin-alert">
                    {error}
                </div>
            )}

            <AccountsTable
                accounts={accounts}
                isLoading={isLoading}
                onOpenAccount={openAccount}
            />

            <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onPageChange={changePage}
            />

            <AccountsViewModal
                accountData={selectedAccount}
                isLoading={isAccountLoading}
                isStatusUpdating={isStatusUpdating}
                error={accountError}
                onClose={closeAccount}
                onUpdateStatus={updateAccountStatus}
                isRoleUpdating={isRoleUpdating}
                onUpdateRole={updateAccountRole}
            />
        </div>
    );
}