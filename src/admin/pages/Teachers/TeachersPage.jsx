import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Pagination } from '../../components/ui/index.js';

import { useTeachers } from '../../hooks/useTeachers.js';

import { TeachersTable } from './TeachersTable.jsx';
import { TeachersToolbar } from './TeachersToolbar.jsx';
import { TeachersViewModal } from './TeachersViewModal.jsx';

import './teachers.css';

export function TeachersPage() {
    const navigate = useNavigate();
    const { teacherId } = useParams();
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

    useEffect(() => {
        if (/^[1-9]\d*$/.test(teacherId || '')) {
            openTeacher(Number(teacherId));
        }
    }, [openTeacher, teacherId]);

    function closeTeacherProfile() {
        closeTeacher();

        if (teacherId) {
            navigate('/admin/teachers', { replace: true });
        }
    }

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
                onClose={closeTeacherProfile}
                onUpdateStatus={updateTeacherStatus}
                onUpdateVerification={updateTeacherVerification}
            />
        </div>
    );
}