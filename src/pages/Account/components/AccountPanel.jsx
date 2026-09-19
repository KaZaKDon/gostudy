import { ClassroomTodaySection } from '../sections/ClassroomTodaySection.jsx';
import { HomeworkSection } from '../sections/Homework/HomeworkSection.jsx';
import { JournalSection } from '../sections/Journal/JournalSection.jsx';
import { MaterialsSection } from '../sections/Materials/MaterialsSection.jsx';
import { ScheduleSection } from '../sections/Schedule/ScheduleSection.jsx';
import { TeacherStudentsSection } from '../sections/TeacherStudents/TeacherStudentsSection.jsx';
import { DiarySection } from '../sections/Diary/DiarySection.jsx';
import { MessagesSection } from '../sections/Messages/MessagesSection.jsx';
import { ReviewsSection } from '../sections/Reviews/ReviewsSection.jsx';
import { PaymentsSection } from '../sections/Payments/PaymentsSection.jsx';
import { SettingsSection } from '../sections/Settings/SettingsSection.jsx';
import { FindTeacherSection } from '../sections/FindTeacher/FindTeacherSection.jsx';
import { NotificationsMenu } from '../sections/Notifications/NotificationsMenu.jsx';
import { ParentChildrenSection } from '../sections/ParentChildren/ParentChildrenSection.jsx';
import { ParentDashboard } from '../sections/ParentDashboard/ParentDashboard.jsx';
import { StudentFamilySection } from '../sections/StudentFamily/StudentFamilySection.jsx';
import { TeacherRatingDashboard } from '../sections/TeacherRating/TeacherRatingDashboard.jsx';
import { AccessibilitySection } from '../sections/Accessibility/AccessibilitySection.jsx';

export function AccountPanel({
    title,
    stats,
    teacherRatingController,
    role,
    user,
    profile,
    subjects,
    documents,
    identity,
    activeSection,
    accessibilityTab,
    materialsController,
    homeworkController,
    targetHomeworkId,
    createHomeworkRelationId,
    createHomeworkLessonId,
    targetDiaryLessonId,
    targetJournalLessonId,
    targetJournalStudentId,
    targetJournalSubjectId,
    messagesController,
    notificationsController,
    messageTarget,
    teacherStudentsView,
    teacherStudentsStatus,
    payments,
    scheduleRevision,
    scheduleFocusDate,
    scheduleFocusLessonId,
    onAddLesson,
    onTeacherRequestSent,
    onFindTeacher,
    onOpenHomework,
    onOpenParentSchedule,
    onOpenParentDiary,
    onOpenSection,
    onOpenStudentMessage,
    onCreateStudentHomework,
    onOpenStudentJournal,
    onCloseHomeworkCreate,
    onOpenNotification,
}) {
    const isTeacherStudentsSection =
        role === 'teacher' && activeSection === 'students';
    const isTeacherDashboard =
        role === 'teacher' && activeSection === 'dashboard';
    const isParentDashboard =
        role === 'parent' && activeSection === 'dashboard';

    const isScheduleSection = activeSection === 'schedule';
    const isMaterialsSection = activeSection === 'materials';
    const isAccessibilitySection =
        role === 'teacher' && activeSection === 'accessibility';
    const isHomeworkSection = activeSection === 'homework';
    const isJournalSection = activeSection === 'journal';
    const isDiarySection = activeSection === 'diary';
    const isMessagesSection = activeSection === 'messages';
    const isReviewsSection =
        activeSection === 'reviews' || activeSection === 'teachers';
    const isPaymentsSection = activeSection === 'payments';
    const isSettingsSection = activeSection === 'settings';
    const isFindTeacherSection = activeSection === 'findTeacher';

    const greeting = (() => {
        const hour = new Date().getHours();

        if (hour < 12) {
            return 'Доброе утро';
        }

        if (hour < 18) {
            return 'Добрый день';
        }

        return 'Добрый вечер';
    })();

    return (
        <section className="account-panel">
            <header className="account-panel__header">
                <div>
                    <span className="account-panel__eyebrow">
                        {greeting},
                    </span>

                    <h1>
                        {identity?.displayName || title}
                    </h1>
                </div>

                <div className="account-panel__header-actions">
                    <NotificationsMenu
                        controller={notificationsController}
                        onOpenNotification={onOpenNotification}
                    />

                    <span className="account-panel__role">
                        {role === 'teacher'
                            ? 'Преподаватель'
                            : role === 'parent'
                                ? 'Родитель'
                                : 'Ученик'}
                    </span>
                </div>
            </header>

            {stats.length > 0 &&
                !isTeacherStudentsSection &&
                !isScheduleSection &&
                !isMaterialsSection &&
                !isAccessibilitySection &&
                !isHomeworkSection &&
                !isJournalSection &&
                !isDiarySection &&
                !isMessagesSection &&
                !isReviewsSection &&
                !isPaymentsSection &&
                !isSettingsSection &&
                !isFindTeacherSection && (
                    <div className="account-panel__stats">
                        {stats.map((item) => (
                            <article
                                key={item.label}
                                className="account-stat"
                            >
                                <strong>{item.value}</strong>
                                <span>{item.label}</span>
                            </article>
                        ))}
                    </div>
                )}

            {isParentDashboard ? (
                <ParentDashboard
                    onOpenSection={onOpenSection}
                    onOpenSchedule={onOpenParentSchedule}
                    onOpenHomework={onOpenHomework}
                    onOpenDiary={onOpenParentDiary}
                />
            ) : isTeacherDashboard ? (
                <TeacherRatingDashboard
                    controller={teacherRatingController}
                />
            ) : activeSection === 'classroom' ? (
                <ClassroomTodaySection
                    role={role}
                />
            ) : isTeacherStudentsSection ? (
                <TeacherStudentsSection
                    key={`${teacherStudentsView}:${teacherStudentsStatus}`}
                    initialView={teacherStudentsView}
                    initialStatusTab={teacherStudentsStatus}
                    onAddLesson={onAddLesson}
                    onOpenMessage={onOpenStudentMessage}
                    onCreateHomework={onCreateStudentHomework}
                    onOpenJournal={onOpenStudentJournal}
                />
            ) : isScheduleSection ? (
                <ScheduleSection
                    key={`${scheduleRevision}:${scheduleFocusDate || ''}:${scheduleFocusLessonId || ''}`}
                    role={role}
                    onAddLesson={onAddLesson}
                    refreshKey={scheduleRevision}
                    initialDate={scheduleFocusDate}
                    initialLessonId={scheduleFocusLessonId}
                />
            ) : isMaterialsSection ? (
                <MaterialsSection
                    role={role}
                    controller={materialsController}
                />
            ) : isAccessibilitySection ? (
                <AccessibilitySection
                    key={accessibilityTab}
                    initialTab={accessibilityTab}
                />
            ) : isHomeworkSection ? (
                <HomeworkSection
                    role={role}
                    controller={homeworkController}
                    targetHomeworkId={targetHomeworkId}
                    createRelationId={createHomeworkRelationId}
                    createLessonId={createHomeworkLessonId}
                    onCloseCreate={onCloseHomeworkCreate}
                />
            ) : isJournalSection ? (
                <JournalSection
                    targetLessonId={targetJournalLessonId}
                    initialStudentId={targetJournalStudentId}
                    initialSubjectId={targetJournalSubjectId}
                />
            ) : isDiarySection ? (
                <DiarySection
                    role={role}
                    targetLessonId={targetDiaryLessonId}
                    onOpenHomework={onOpenHomework}
                />
            ) : isMessagesSection ? (
                <MessagesSection
                    role={role}
                    messagesController={messagesController}
                    messageTarget={messageTarget}
                />
            ) : isReviewsSection ? (
                <ReviewsSection
                    role={role}
                    onFindTeacher={onFindTeacher}
                />
            ) : isPaymentsSection ? (
                <PaymentsSection
                    role={role}
                    payments={payments}
                />
            ) : isSettingsSection ? (
                <SettingsSection
                    role={role}
                    user={user}
                    profile={profile}
                    subjects={subjects}
                    documents={documents}
                />
            ) : isFindTeacherSection ? (
                <FindTeacherSection
                    role={role}
                    onRequestSent={onTeacherRequestSent}
                />
            ) : role === 'parent' && activeSection === 'children' ? (
                <ParentChildrenSection />
            ) : role === 'student' && activeSection === 'family' ? (
                <StudentFamilySection />
            ) : (
                <div className="account-panel__placeholder">
                    <h2>{title}</h2>

                    <p>
                        Раздел находится в разработке. Здесь будут отображаться
                        реальные данные пользователя.
                    </p>
                </div>
            )}
        </section>
    );
}
