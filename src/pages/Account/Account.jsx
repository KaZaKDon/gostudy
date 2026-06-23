import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AccountSidebar } from './components/AccountSidebar.jsx';
import { AccountPanel } from './components/AccountPanel.jsx';

import {
    STUDENT_NAVIGATION,
    TEACHER_NAVIGATION,
} from './data/accountNavigation.js';

import {
    accountMaterials,
    studentDemoProfile,
    studentDemoStats,
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
    const [searchParams] = useSearchParams();

    const [activeSection, setActiveSection] = useState('schedule');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [teacherStudentsState, setTeacherStudentsState] =
        useState(teacherStudents);

    const [studentTeachersState, setStudentTeachersState] =
        useState(studentReviews);

    const role =
        searchParams.get('role') === 'teacher'
            ? 'teacher'
            : 'student';

    const navigation =
        role === 'teacher'
            ? TEACHER_NAVIGATION
            : STUDENT_NAVIGATION;

    const profile =
        role === 'teacher'
            ? teacherDemoProfile
            : studentDemoProfile;

    const stats =
        role === 'teacher'
            ? teacherDemoStats
            : studentDemoStats;

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

        setTeacherStudentsState((currentStudents) => {
            const alreadyExists = currentStudents.some(
                (student) => student.name === studentDemoProfile.firstName,
            );

            if (alreadyExists) {
                return currentStudents;
            }

            return [
                ...currentStudents,
                {
                    id: Date.now(),
                    name: `${studentDemoProfile.firstName} ${studentDemoProfile.lastName}`,
                    grade: '8 класс',
                    subject: teacher.subject,
                    status: 'requests',
                    nextLesson: 'Не назначен',
                    progress: 0,
                    balance: 'оплата не начата',
                    parent: {
                        name: 'Елена Казакова',
                        phone: '+7 900 000-00-00',
                        email: 'parent@example.com',
                    },
                    summary: {
                        goal: `Хочет начать обучение по предмету: ${teacher.subject}.`,
                        format: 'Формат и расписание нужно согласовать',
                        startedAt: 'Заявка создана сейчас',
                        level: 'Нужно определить',
                    },
                    lessons: [],
                    homework: [],
                    program: ['Диагностика уровня', 'План обучения'],
                    materials: [],
                    payments: [],
                    notes: [
                        'Заявка создана учеником через публичную анкету преподавателя.',
                    ],
                    feedback: [],
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
                    onChangeTeacherStudentStatus={handleChangeTeacherStudentStatus}
                    onSendTeacherRequest={handleSendTeacherRequest}
                />
            </div>
        </main>
    );
}