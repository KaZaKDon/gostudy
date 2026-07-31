import { useEffect, useState } from 'react';
import {
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import { API, getAuthHeaders } from '../../api/api.js';

import { AccountSidebar } from './components/AccountSidebar.jsx';
import { AccountPanel } from './components/AccountPanel.jsx';
import { CreateLessonModal } from './sections/Lessons/CreateLessonModal.jsx';
import { useMessages } from './sections/Messages/useMessages.js';
import { useNotifications } from './sections/Notifications/useNotifications.js';
import { useHomework } from './sections/Homework/useHomework.js';

import {
    STUDENT_NAVIGATION,
    TEACHER_NAVIGATION,
} from './data/accountNavigation.js';

import { createAccountIdentity } from './utils/accountIdentity.js';

import {
    accountMaterials,
    teacherDemoStats,
    teacherPayments,
    studentPayments,
} from './data/demoAccountData.js';

import './Account.css';

export function Account() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [authData, setAuthData] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [lessonCreation, setLessonCreation] = useState(null);
    const [scheduleRevision, setScheduleRevision] = useState(0);
    const [scheduleFocusDate, setScheduleFocusDate] = useState(null);
    const [messageTarget, setMessageTarget] = useState(null);

    const messagesController = useMessages(
        authData?.user?.role ?? null,
    );
    const notificationsController = useNotifications(Boolean(authData));
    const homeworkController = useHomework(
        authData?.user?.role ?? null,
    );

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

    const baseNavigation =
        role === 'teacher'
            ? TEACHER_NAVIGATION
            : STUDENT_NAVIGATION;

    const navigation = baseNavigation.map((item) => {
        if (item.id === 'messages') {
            return {
                ...item,
                count: messagesController.totalUnread || undefined,
            };
        }

        if (item.id === 'homework') {
            return {
                ...item,
                count: homeworkController.actionableCount || undefined,
            };
        }

        return item;
    });

    const identity = createAccountIdentity({
        user: authData.user,
        profile: authData.profile,
    });

    const availableSectionIds = new Set([
        ...navigation.map((item) => item.id),
        ...(role === 'student' ? ['findTeacher'] : []),
    ]);

    const requestedSection = searchParams.get('section');

    const activeSection = availableSectionIds.has(requestedSection)
        ? requestedSection
        : navigation[0].id;

    const stats =
        role === 'teacher'
            ? teacherDemoStats
            : [];

    const payments =
        role === 'teacher'
            ? teacherPayments
            : studentPayments;

    const activeNavigationItem =
        navigation.find((item) => item.id === activeSection) ?? navigation[0];

    const handleSelectSection = (sectionId) => {
        if (!availableSectionIds.has(sectionId)) {
            return;
        }

        setSearchParams(
            { section: sectionId },
            { replace: false },
        );

        setIsSidebarOpen(false);
    };

    const handleOpenLessonCreation = (student = null) => {
        setLessonCreation({
            initialRelationId: student?.relationId ?? null,
        });
    };

    const handleLessonCreated = (lesson) => {
        setLessonCreation(null);
        setScheduleFocusDate(lesson?.lesson_date ?? null);
        setScheduleRevision((revision) => revision + 1);
        handleSelectSection('schedule');
    };

    const handleOpenNotification = (notification) => {
        const targetSection = notification.targetSection;

        if (!targetSection || !availableSectionIds.has(targetSection)) {
            return;
        }

        if (targetSection === 'schedule' && notification.targetDate) {
            setScheduleFocusDate(notification.targetDate);
            setScheduleRevision((revision) => revision + 1);
        }

        if (
            targetSection === 'messages'
            && notification.targetEntityType === 'dialog'
            && notification.targetEntityId
        ) {
            setMessageTarget({
                dialogId: notification.targetEntityId,
                requestId: notification.id,
            });
        }

        if (
            targetSection === 'homework'
            && notification.targetEntityType === 'homework'
            && notification.targetEntityId
        ) {
            setSearchParams({
                section: 'homework',
                homework: String(notification.targetEntityId),
            });
            setIsSidebarOpen(false);
            return;
        }

        if (
            targetSection === 'diary'
            && notification.targetEntityType === 'lesson'
            && notification.targetEntityId
        ) {
            setSearchParams({
                section: 'diary',
                lesson: String(notification.targetEntityId),
            });
            setIsSidebarOpen(false);
            return;
        }

        if (
            targetSection === 'students'
            && notification.targetEntityType === 'review'
        ) {
            setSearchParams({
                section: 'students',
                view: 'reviews',
            });
            setIsSidebarOpen(false);
            return;
        }

        handleSelectSection(targetSection);
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
                    identity={identity}
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
                    subjects={authData.subjects}
                    documents={authData.documents}
                    identity={identity}
                    activeSection={activeSection}
                    materials={accountMaterials}
                    homeworkController={homeworkController}
                    targetHomeworkId={
                        Number(searchParams.get('homework')) || null
                    }
                    createHomeworkRelationId={
                        searchParams.get('create') === '1'
                            ? Number(searchParams.get('relation')) || null
                            : null
                    }
                    createHomeworkLessonId={
                        searchParams.get('create') === '1'
                            ? Number(searchParams.get('lesson')) || null
                            : null
                    }
                    targetDiaryLessonId={
                        Number(searchParams.get('lesson')) || null
                    }
                    targetJournalLessonId={
                        activeSection === 'journal'
                            ? Number(searchParams.get('lesson')) || null
                            : null
                    }
                    targetJournalStudentId={
                        activeSection === 'journal'
                            ? Number(searchParams.get('student')) || null
                            : null
                    }
                    targetJournalSubjectId={
                        activeSection === 'journal'
                            ? Number(searchParams.get('subject')) || null
                            : null
                    }
                    messagesController={messagesController}
                    notificationsController={notificationsController}
                    messageTarget={messageTarget}
                    teacherStudentsView={
                        searchParams.get('view') === 'reviews'
                            ? 'reviews'
                            : 'students'
                    }
                    payments={payments}
                    scheduleRevision={scheduleRevision}
                    scheduleFocusDate={scheduleFocusDate}
                    onAddLesson={
                        role === 'teacher'
                            ? handleOpenLessonCreation
                            : () => handleSelectSection('findTeacher')
                    }
                    onFindTeacher={() => handleSelectSection('findTeacher')}
                    onOpenHomework={(homeworkId) => {
                        const nextParams = { section: 'homework' };

                        if (homeworkId) {
                            nextParams.homework = String(homeworkId);
                        }

                        setSearchParams(nextParams);
                        setIsSidebarOpen(false);
                    }}
                    onOpenStudentMessage={(student) => {
                        setMessageTarget({
                            studentId: student.studentId,
                            channelType: 'student',
                            requestId: Date.now(),
                        });
                        handleSelectSection('messages');
                    }}
                    onCreateStudentHomework={(student) => {
                        setSearchParams({
                            section: 'homework',
                            create: '1',
                            relation: String(student.relationId),
                        });
                        setIsSidebarOpen(false);
                    }}
                    onOpenStudentJournal={(student) => {
                        setSearchParams({
                            section: 'journal',
                            student: String(student.studentId),
                            subject: String(student.subjectId),
                        });
                        setIsSidebarOpen(false);
                    }}
                    onCloseHomeworkCreate={() => {
                        setSearchParams({ section: 'homework' });
                    }}
                    onOpenNotification={handleOpenNotification}
                    onTeacherRequestSent={() =>
                        handleSelectSection('teachers')
                    }
                />
            </div>

            {role === 'teacher' && lessonCreation && (
                <CreateLessonModal
                    initialRelationId={
                        lessonCreation.initialRelationId
                    }
                    onClose={() => setLessonCreation(null)}
                    onCreated={handleLessonCreated}
                />
            )}
        </main>
    );
}
