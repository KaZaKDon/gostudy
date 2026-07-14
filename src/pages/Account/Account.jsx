import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { API, getAuthHeaders } from '../../api/api.js';

import { AccountSidebar } from './components/AccountSidebar.jsx';
import { AccountPanel } from './components/AccountPanel.jsx';

import {
    STUDENT_NAVIGATION,
    TEACHER_NAVIGATION,
} from './data/accountNavigation.js';

import {
    accountMaterials,
    studentScheduleWeek,
    studentTodayLessons,
    teacherDemoProfile,
    teacherDemoStats,
    teacherHomework,
    teacherScheduleWeek,
    teacherStudents,
    teacherTodayLessons,
    teacherJournal,
    studentDiary,
    teacherMessages,
    studentMessages,
    teacherReviews,
    studentReviews,
    teacherPayments,
    studentPayments,
} from './data/demoAccountData.js';

import './Account.css';

export function Account() {
    const navigate = useNavigate();

    const [authData, setAuthData] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const [activeSection, setActiveSection] = useState('schedule');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [teacherStudentsState, setTeacherStudentsState] =
        useState(teacherStudents);

    const [studentTeachersState, setStudentTeachersState] =
        useState(studentReviews);

    useEffect(() => {
        const loadProfile = async () => {
            const token = sessionStorage.getItem('gostudy_token');

            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch(API.me, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    sessionStorage.removeItem('gostudy_token');
                    sessionStorage.removeItem('gostudy_user');
                    navigate('/login');
                    return;
                }

                sessionStorage.setItem(
                    'gostudy_user',
                    JSON.stringify(result.user),
                );

                if (!result.user.profile_completed) {
                    navigate(`/profile-start?role=${result.user.role}`);
                    return;
                }

                setAuthData(result);
            } catch {
                navigate('/login');
            } finally {
                setIsCheckingAuth(false);
            }
        };

        loadProfile();
    }, [navigate]);

    if (isCheckingAuth) {
        return (
            <main className="account account--student">
                <div className="account__layout">
                    <p style={{ padding: '32px' }}>Загружаем кабинет...</p>
                </div>
            </main>
        );
    }

    if (!authData) {
        return null;
    }

    const role = authData.user.role;

    const navigation =
        role === 'teacher'
            ? TEACHER_NAVIGATION
            : STUDENT_NAVIGATION;

    const profile =
        role === 'teacher'
            ? teacherDemoProfile
            : {
                firstName:
                    authData?.profile?.first_name || '',
                lastName:
                    authData?.profile?.last_name || '',
                roleTitle: 'Ученик',
                avatarUrl:
                    authData?.user?.avatar_url || null,
            };

    const stats =
        role === 'teacher'
            ? teacherDemoStats
            : [];

    const todayLessons =
        role === 'teacher'
            ? teacherTodayLessons
            : studentTodayLessons;

    const scheduleWeek =
        role === 'teacher'
            ? teacherScheduleWeek
            : studentScheduleWeek;

    const homework =
        role === 'teacher'
            ? teacherHomework
            : [];

    const diary =
        role === 'student'
            ? studentDiary
            : [];

    const messages =
        role === 'teacher'
            ? teacherMessages
            : studentMessages;

    const reviews =
        role === 'teacher'
            ? teacherReviews
            : studentTeachersState;

    const payments =
        role === 'teacher'
            ? teacherPayments
            : studentPayments;

    const activeNavigationItem =
        navigation.find((item) => item.id === activeSection) ?? navigation[0];

    const handleSelectSection = (sectionId) => {
        setActiveSection(sectionId);
        setIsSidebarOpen(false);
    };

    const handleChangeTeacherStudentStatus = (studentId, nextStatus) => {
        setTeacherStudentsState((currentStudents) =>
            currentStudents.map((student) =>
                student.id === studentId
                    ? {
                        ...student,
                        status: nextStatus,
                    }
                    : student,
            ),
        );
    };

    const handleSendTeacherRequest = (teacher) => {
        setStudentTeachersState((currentTeachers) => {
            const alreadyExists = currentTeachers.some(
                (item) => item.id === teacher.id,
            );

            if (alreadyExists) {
                return currentTeachers;
            }

            return [
                ...currentTeachers,
                {
                    id: teacher.id,
                    teacherName: teacher.name,
                    subject: teacher.subject,
                    status: 'requests',
                    requestStatus: 'Ожидает ответа преподавателя',
                    rating: null,
                    reviewText: '',
                },
            ];
        });

        setActiveSection('teachers');
    };

    return (
        <main
            className={
                role === 'teacher'
                    ? 'account account--teacher'
                    : 'account account--student'
            }
        >
            <button
                type="button"
                className="account-mobile-menu"
                aria-label="Открыть меню кабинета"
                onClick={() => setIsSidebarOpen(true)}
            >
                <span />
                <span />
                <span />
            </button>

            {isSidebarOpen && (
                <button
                    type="button"
                    className="account-overlay"
                    aria-label="Закрыть меню кабинета"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="account__layout">
                <AccountSidebar
                    profile={profile}
                    navigation={navigation}
                    activeSection={activeSection}
                    onSelectSection={handleSelectSection}
                    isOpen={isSidebarOpen}
                />

                <AccountPanel
                    title={activeNavigationItem.title}
                    stats={stats}
                    role={role}
                    user={authData.user}
                    profile={authData.profile}
                    activeSection={activeSection}
                    todayLessons={todayLessons}
                    teacherStudents={teacherStudentsState}
                    scheduleWeek={scheduleWeek}
                    materials={accountMaterials}
                    homework={homework}
                    journal={teacherJournal}
                    diary={diary}
                    messages={messages}
                    reviews={reviews}
                    payments={payments}
                    onAddLesson={
                        role === 'student'
                            ? () => setActiveSection('findTeacher')
                            : undefined
                    }
                    onFindTeacher={() => setActiveSection('findTeacher')}
                    onChangeTeacherStudentStatus={handleChangeTeacherStudentStatus}
                    onSendTeacherRequest={handleSendTeacherRequest}
                />
            </div>
        </main>
    );
}