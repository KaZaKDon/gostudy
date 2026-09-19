import { useEffect, useState } from 'react';
import {
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import {
    API,
    API_FEATURES,
    getAuthHeaders,
} from '../../api/api.js';

import { AccountSidebar } from './components/AccountSidebar.jsx';
import { AccountPanel } from './components/AccountPanel.jsx';
import { CreateLessonModal } from './sections/Lessons/CreateLessonModal.jsx';
import { useMessages } from './sections/Messages/useMessages.js';
import { useNotifications } from './sections/Notifications/useNotifications.js';
import { useHomework } from './sections/Homework/useHomework.js';
import { useMaterials } from './sections/Materials/useMaterials.js';
import { useTeacherDashboardStats } from './hooks/useTeacherDashboardStats.js';
import { useTeacherRatingSummary } from './hooks/useTeacherRatingSummary.js';

import {
    PARENT_NAVIGATION,
    STUDENT_NAVIGATION,
    TEACHER_NAVIGATION,
} from './data/accountNavigation.js';

import { createAccountIdentity } from './utils/accountIdentity.js';

import { teacherPayments, studentPayments } from './data/demoAccountData.js';

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
    const [scheduleFocusLessonId, setScheduleFocusLessonId] = useState(null);
    const [messageTarget, setMessageTarget] = useState(null);

    const messagesController = useMessages(
        API_FEATURES.messages
            ? authData?.user?.role ?? null
            : null,
    );
    const notificationsController = useNotifications(
        API_FEATURES.notifications && Boolean(authData),
    );
    const homeworkController = useHomework(
        API_FEATURES.homework
            && ['student', 'teacher', 'parent'].includes(authData?.user?.role)
            ? authData?.user?.role ?? null
            : null,
    );
    const materialsController = useMaterials(
        API_FEATURES.materials
            && ['student', 'teacher'].includes(authData?.user?.role)
            ? authData?.user?.role ?? null
            : null,
    );
    const teacherStats = useTeacherDashboardStats(
        authData?.user?.role === 'teacher',
    );
    const teacherRatingController = useTeacherRatingSummary(
        authData?.user?.role === 'teacher',
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
            : role === 'parent'
                ? PARENT_NAVIGATION
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

        if (role === 'teacher' && item.id === 'students') {
            return {
                ...item,
                count:
                    notificationsController.teacherRequestsCount
                    || undefined,
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
            ? teacherStats
            : [];

    const payments =
        role === 'teacher'
            ? teacherPayments
            : role === 'student'
                ? studentPayments
                : [];

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
        const requestedTargetSection = notification.targetSection;
        const targetSection = requestedTargetSection === 'accessibilityApplications'
            ? 'accessibility'
            : requestedTargetSection;

        if (!targetSection || !availableSectionIds.has(targetSection)) {
            return;
        }

        if (
            targetSection === 'accessibility'
            && (
                requestedTargetSection === 'accessibilityApplications'
                || notification.targetEntityType === 'accessibility_application'
            )
        ) {
            setSearchParams({
                section: 'accessibility',
                tab: 'applications',
            });
            setIsSidebarOpen(false);
            return;
        }

        if (targetSection === 'schedule' && notification.targetDate) {
            setScheduleFocusDate(notification.targetDate);
            setScheduleFocusLessonId(
                notification.targetEntityType === 'lesson'
                    ? notification.targetEntityId
                    : null,
            );
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
            && notification.targetEntityType === 'teacher_request'
        ) {
            setSearchParams({
                section: 'students',
                status: 'requests',
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
                    : role === 'parent'
                        ? 'account account--parent'
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
                    accessibilityTab={
                        searchParams.get('tab') === 'applications'
                            ? 'applications'
                            : 'offers'
                    }
                    onSelectSection={handleSelectSection}
                    isOpen={isSidebarOpen}
                />

                <AccountPanel
                    title={activeNavigationItem.title}
                    stats={stats}
                    teacherRatingController={teacherRatingController}
                    role={role}
                    user={authData.user}
                    profile={authData.profile}
                    subjects={authData.subjects}
                    documents={authData.documents}
                    identity={identity}
                    activeSection={activeSection}
                    materialsController={materialsController}
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
                    teacherStudentsStatus={
                        searchParams.get('status') === 'requests'
                            ? 'requests'
                            : searchParams.get('status') === 'archive'
                                ? 'archive'
                                : 'active'
                    }
                    payments={payments}
                    scheduleRevision={scheduleRevision}
                    scheduleFocusDate={scheduleFocusDate}
                    scheduleFocusLessonId={scheduleFocusLessonId}
                    onAddLesson={
                        role === 'teacher' && API_FEATURES.lessonCreation
                            ? handleOpenLessonCreation
                            : role === 'student'
                                ? () => handleSelectSection('findTeacher')
                                : null
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
                    onOpenParentSchedule={(lesson) => {
                        setScheduleFocusDate(
                            lesson.lesson_date?.slice(0, 10) || null,
                        );
                        setScheduleFocusLessonId(lesson.id);
                        setScheduleRevision((revision) => revision + 1);
                        handleSelectSection('schedule');
                    }}
                    onOpenParentDiary={(lessonId) => {
                        setSearchParams({
                            section: 'diary',
                            lesson: String(lessonId),
                        });
                        setIsSidebarOpen(false);
                    }}
                    onOpenSection={handleSelectSection}
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
                />
            </div>

            {role === 'teacher'
                && API_FEATURES.lessonCreation
                && lessonCreation && (
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
