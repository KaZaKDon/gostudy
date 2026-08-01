import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Pagination } from '../../components/ui/index.js';
import { useStudents } from '../../hooks/useStudents.js';

import { StudentsTable } from './StudentsTable.jsx';
import { StudentsToolbar } from './StudentsToolbar.jsx';
import { StudentsViewModal } from './StudentsViewModal.jsx';

import './students.css';

export function StudentsPage() {
    const navigate = useNavigate();
    const { studentId } = useParams();
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

    useEffect(() => {
        if (/^[1-9]\d*$/.test(studentId || '')) {
            openStudent(Number(studentId));
        }
    }, [openStudent, studentId]);

    function closeStudentProfile() {
        closeStudent();

        if (studentId) {
            navigate('/admin/students', { replace: true });
        }
    }

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
                onClose={closeStudentProfile}
                onUpdateStatus={updateStudentStatus}
            />
        </div>
    );
}