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

export function AccountPanel({
    title,
    stats,
    role,
    user,
    profile,
    activeSection,
    todayLessons,
    teacherStudents,
    scheduleWeek,
    materials,
    homework,
    journal,
    diary,
    messages,
    reviews,
    payments,
    onAddLesson,
    onChangeTeacherStudentStatus,
    onSendTeacherRequest,
    onFindTeacher,
}) {
    const isTeacherStudentsSection =
        role === 'teacher' && activeSection === 'students';

    const isScheduleSection = activeSection === 'schedule';
    const isMaterialsSection = activeSection === 'materials';
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

    const fullName =
        profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : '';

    return (
        <section className="account-panel">
            <header className="account-panel__header">
                <div>
                    <span className="account-panel__eyebrow">
                        {greeting},
                    </span>

                    <h1>
                        {fullName || title}
                    </h1>
                </div>

                <span className="account-panel__role">
                    {role === 'teacher'
                        ? 'Преподаватель'
                        : 'Ученик'}
                </span>
            </header>

            {stats.length > 0 &&
                !isTeacherStudentsSection &&
                !isScheduleSection &&
                !isMaterialsSection &&
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

            {activeSection === 'classroom' ? (
                <ClassroomTodaySection
                    role={role}
                    lessons={todayLessons}
                />
            ) : isTeacherStudentsSection ? (
                <TeacherStudentsSection
                    students={teacherStudents}
                    onChangeStudentStatus={onChangeTeacherStudentStatus}
                />
            ) : isScheduleSection ? (
                <ScheduleSection
                    role={role}
                    week={scheduleWeek}
                    onAddLesson={onAddLesson}
                />
            ) : isMaterialsSection ? (
                <MaterialsSection
                    role={role}
                    materials={materials}
                />
            ) : isHomeworkSection ? (
                <HomeworkSection
                    role={role}
                    homework={homework}
                />
            ) : isJournalSection ? (
                <JournalSection journal={journal} />
            ) : isDiarySection ? (
                <DiarySection
                    role={role}
                    diary={diary}
                />
            ) : isMessagesSection ? (
                <MessagesSection
                    role={role}
                    messages={messages}
                />
            ) : isReviewsSection ? (
                <ReviewsSection
                    role={role}
                    reviews={reviews}
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
                />
            ) : isFindTeacherSection ? (
                <FindTeacherSection
                    onSendTeacherRequest={onSendTeacherRequest}
                />
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