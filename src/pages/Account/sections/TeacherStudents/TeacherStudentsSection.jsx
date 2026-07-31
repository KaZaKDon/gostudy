import { useMemo, useState } from 'react';

import { TeacherStudentsSidebar } from './components/TeacherStudentsSidebar.jsx';
import { TeacherStudentProfile } from './components/TeacherStudentProfile.jsx';
import { ReviewsSection } from '../Reviews/ReviewsSection.jsx';

import { getFilteredStudents } from './utils.js';
import { useTeacherStudents } from './useTeacherStudents.js';

import './TeacherStudentsSection.css';

const STUDENT_STATUS_TABS = [
    { id: 'active', label: 'Активные' },
    { id: 'requests', label: 'Заявки' },
    { id: 'archive', label: 'Архив' },
];

export function TeacherStudentsSection({
    initialView = 'students',
    onAddLesson,
    onOpenMessage,
    onCreateHomework,
    onOpenJournal,
}) {
    const {
        students,
        requestStatus,
        actionStatus,
        errorMessage,
        respondToRequest,
        updateStudentStatus,
    } = useTeacherStudents();

    const [statusTab, setStatusTab] = useState('active');
    const [searchValue, setSearchValue] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(
        null,
    );
    const [activeTab, setActiveTab] = useState('overview');
    const [workspaceTab, setWorkspaceTab] = useState(initialView);

    const studentsByStatus = useMemo(() => {
        return students[statusTab] || [];
    }, [students, statusTab]);

    const filteredStudents = useMemo(
        () => getFilteredStudents(studentsByStatus, searchValue),
        [studentsByStatus, searchValue],
    );

    const selectedStudent =
        studentsByStatus.find((student) => student.id === selectedStudentId) ??
        filteredStudents[0] ??
        studentsByStatus[0] ??
        null;

    const handleChangeStatusTab = (nextTab) => {
        setStatusTab(nextTab);
        setSearchValue('');
        setSelectedStudentId(null);
        setActiveTab('overview');
    };

    const handleSelectStudent = (studentId) => {
        setSelectedStudentId(studentId);
        setActiveTab('overview');
    };

    const handleChangeStudentStatus = async (student, nextStatus) => {
        const action = nextStatus === 'active'
            ? 'accept'
            : 'reject';

        try {
            await respondToRequest(student.requestId, action);

            if (nextStatus === 'active') {
                setStatusTab('active');
                setSelectedStudentId(null);
            }
        } catch {
            // Сообщение уже отображается внутри раздела.
        }
    };

    const handleUpdateRelationStatus = async (student, action) => {
        try {
            await updateStudentStatus(student.relationId, action);

            setStatusTab(action === 'archive' ? 'archive' : 'active');
            setSelectedStudentId(null);
            setActiveTab('overview');
        } catch {
            // Сообщение уже отображается внутри карточки.
        }
    };

    return (
        <div className="teacher-students-workspace">
            <div className="teacher-students-workspace__tabs">
                <button
                    type="button"
                    className={
                        workspaceTab === 'students'
                            ? 'teacher-students-workspace__tab teacher-students-workspace__tab--active'
                            : 'teacher-students-workspace__tab'
                    }
                    onClick={() => setWorkspaceTab('students')}
                >
                    Ученики
                </button>

                <button
                    type="button"
                    className={
                        workspaceTab === 'reviews'
                            ? 'teacher-students-workspace__tab teacher-students-workspace__tab--active'
                            : 'teacher-students-workspace__tab'
                    }
                    onClick={() => setWorkspaceTab('reviews')}
                >
                    Отзывы
                </button>
            </div>

            {workspaceTab === 'reviews' ? (
                <ReviewsSection role="teacher" />
            ) : (
                <section className="teacher-students">
            <header className="teacher-students__header">
                <div>
                    <span>Мои ученики</span>
                    <h2>Ученики и заявки</h2>
                </div>

                <div className="teacher-students__status-tabs">
                    {STUDENT_STATUS_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={
                                statusTab === tab.id
                                    ? 'teacher-students__status-tab teacher-students__status-tab--active'
                                    : 'teacher-students__status-tab'
                            }
                            onClick={() => handleChangeStatusTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {requestStatus === 'loading' ? (
                <div className="teacher-students__empty">
                    Загружаем учеников...
                </div>
            ) : requestStatus === 'error' ? (
                <div className="teacher-students__empty">
                    {errorMessage}
                </div>
            ) : !studentsByStatus.length ? (
                <div className="teacher-students__empty">
                    В этом разделе пока нет записей.
                </div>
            ) : (
                <div className="teacher-students__layout">
                    <TeacherStudentsSidebar
                        students={filteredStudents}
                        totalStudents={studentsByStatus.length}
                        searchValue={searchValue}
                        selectedStudentId={selectedStudent?.id}
                        onSearchChange={setSearchValue}
                        onSelectStudent={handleSelectStudent}
                    />

                    {selectedStudent && (
                        <TeacherStudentProfile
                            student={selectedStudent}
                            activeTab={activeTab}
                            actionStatus={actionStatus}
                            errorMessage={errorMessage}
                            onTabChange={setActiveTab}
                            onChangeStudentStatus={handleChangeStudentStatus}
                            onAddLesson={onAddLesson}
                            onOpenMessage={onOpenMessage}
                            onCreateHomework={onCreateHomework}
                            onOpenJournal={onOpenJournal}
                            onUpdateRelationStatus={
                                handleUpdateRelationStatus
                            }
                        />
                    )}
                </div>
            )}
                </section>
            )}
        </div>
    );
}
