import { useMemo, useState } from 'react';

import { TeacherStudentsSidebar } from './components/TeacherStudentsSidebar.jsx';
import { TeacherStudentProfile } from './components/TeacherStudentProfile.jsx';

import { getFilteredStudents } from './utils.js';

import './TeacherStudentsSection.css';

const STUDENT_STATUS_TABS = [
    { id: 'active', label: 'Активные' },
    { id: 'requests', label: 'Заявки' },
    { id: 'archive', label: 'Архив' },
];

export function TeacherStudentsSection({
    students,
    onChangeStudentStatus,
}) {
    const [statusTab, setStatusTab] = useState('active');
    const [searchValue, setSearchValue] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(
        students[0]?.id ?? null,
    );
    const [activeTab, setActiveTab] = useState('overview');

    const studentsByStatus = useMemo(() => {
        return students.filter((student) => {
            const studentStatus = student.status ?? 'active';

            return studentStatus === statusTab;
        });
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

    return (
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

            {!studentsByStatus.length ? (
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
                            onTabChange={setActiveTab}
                            onChangeStudentStatus={onChangeStudentStatus}
                        />
                    )}
                </div>
            )}
        </section>
    );
}