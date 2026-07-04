import { Pagination } from '../../components/ui/index.js';

import { useTeachers } from '../../hooks/useTeachers.js';

import { TeachersTable } from './TeachersTable.jsx';
import { TeachersToolbar } from './TeachersToolbar.jsx';
import { TeachersViewModal } from './TeachersViewModal.jsx';

import './teachers.css';

export function TeachersPage() {
    const {
        teachers,
        filters,
        pagination,
        selectedTeacher,

        isLoading,
        isTeacherLoading,
        isStatusUpdating,
        isVerificationUpdating,

        error,
        teacherError,

        updateFilters,
        resetFilters,
        changePage,
        refresh,

        openTeacher,
        closeTeacher,
        updateTeacherStatus,
        updateTeacherVerification,
    } = useTeachers();

    return (
        <div className="admin-page teachers-page">
            <TeachersToolbar
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

            <TeachersTable
                teachers={teachers}
                isLoading={isLoading}
                isStatusUpdating={isStatusUpdating}
                onOpenTeacher={openTeacher}
                onUpdateStatus={updateTeacherStatus}
            />

            <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onPageChange={changePage}
            />

            <TeachersViewModal
                teacherData={selectedTeacher}
                isLoading={isTeacherLoading}
                isStatusUpdating={isStatusUpdating}
                isVerificationUpdating={isVerificationUpdating}
                error={teacherError}
                onClose={closeTeacher}
                onUpdateStatus={updateTeacherStatus}
                onUpdateVerification={updateTeacherVerification}
            />
        </div>
    );
}