import { Pagination } from '../../components/ui/index.js';
import { useStudents } from '../../hooks/useStudents.js';

import { StudentsTable } from './StudentsTable.jsx';
import { StudentsToolbar } from './StudentsToolbar.jsx';
import { StudentsViewModal } from './StudentsViewModal.jsx';

import './students.css';

export function StudentsPage() {
    const {
        students,
        filters,
        pagination,
        selectedStudent,

        isLoading,
        isStudentLoading,
        isStatusUpdating,

        error,
        studentError,

        updateFilters,
        resetFilters,
        changePage,
        refresh,

        openStudent,
        closeStudent,
        updateStudentStatus,
    } = useStudents();

    return (
        <div className="admin-page students-page">
            <StudentsToolbar
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

            <StudentsTable
                students={students}
                isLoading={isLoading}
                isStatusUpdating={isStatusUpdating}
                onOpenStudent={openStudent}
                onUpdateStatus={updateStudentStatus}
            />

            <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onPageChange={changePage}
            />

            <StudentsViewModal
                studentData={selectedStudent}
                isLoading={isStudentLoading}
                isStatusUpdating={isStatusUpdating}
                error={studentError}
                onClose={closeStudent}
                onUpdateStatus={updateStudentStatus}
            />
        </div>
    );
}