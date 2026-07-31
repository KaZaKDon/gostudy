const API_BASE = import.meta.env.DEV
    ? 'https://gostudyonline.ru/api'
    : '/api';

export const API = {
    login: `${API_BASE}/auth/login.php`,
    register: `${API_BASE}/auth/register.php`,
    verifyEmail: `${API_BASE}/auth/verify-email.php`,
    resendVerification: `${API_BASE}/auth/resend-verification.php`,
    forgotPassword: `${API_BASE}/auth/forgot-password.php`,
    resetPassword: `${API_BASE}/auth/reset-password.php`,

    me: `${API_BASE}/profile/me.php`,
    updateAccount: `${API_BASE}/profile/update-account.php`,
    updateTeacherVisibility: `${API_BASE}/profile/update-visibility.php`,
    accountSecurity: `${API_BASE}/auth/security.php`,
    teacherOptions: `${API_BASE}/profile/teacher-options.php`,
    updateTeacher: `${API_BASE}/profile/update-teacher.php`,
    uploadTeacherPhoto: `${API_BASE}/profile/upload-photo.php`,
    uploadTeacherVideo: `${API_BASE}/profile/upload-video.php`,
    deleteTeacherMedia: `${API_BASE}/profile/delete-media.php`,
    uploadTeacherDocument: `${API_BASE}/profile/upload-document.php`,
    deleteTeacherDocument: `${API_BASE}/profile/delete-document.php`,
    updateStudent: `${API_BASE}/profile/update-student.php`,
    studentProfile: `${API_BASE}/profile/student.php`,
    schedule: `${API_BASE}/lessons/schedule.php`,
    requestLessonChange: `${API_BASE}/lessons/request-change.php`,
    respondLessonChange: `${API_BASE}/lessons/respond-change.php`,
    withdrawLessonChange: `${API_BASE}/lessons/withdraw-change.php`,
    studentSchedule: `${API_BASE}/student/schedule.php`,
    homework: `${API_BASE}/homework/index.php`,
    homeworkShow: `${API_BASE}/homework/show.php`,
    homeworkOptions: `${API_BASE}/homework/options.php`,
    createHomework: `${API_BASE}/homework/create.php`,
    submitHomework: `${API_BASE}/homework/submit.php`,
    reviewHomework: `${API_BASE}/homework/review.php`,
    cancelHomework: `${API_BASE}/homework/cancel.php`,
    markHomeworkViewed: `${API_BASE}/homework/mark-viewed.php`,
    downloadHomeworkFile: `${API_BASE}/homework/download.php`,
    studentNotificationSettings: `${API_BASE}/student/notification-settings.php`,
    studentDiary: `${API_BASE}/student/diary.php`,
    teacherJournal: `${API_BASE}/journal/index.php`,
    saveJournalResult: `${API_BASE}/journal/save.php`,
    classroomShow: `${API_BASE}/classroom/show.php`,
    classroomSync: `${API_BASE}/classroom/sync.php`,
    classroomStart: `${API_BASE}/classroom/start.php`,
    classroomFinish: `${API_BASE}/classroom/finish.php`,
    classroomSendMessage: `${API_BASE}/classroom/send-message.php`,
    classroomSaveNote: `${API_BASE}/classroom/save-note.php`,
    classroomUploadFile: `${API_BASE}/classroom/upload-file.php`,
    classroomDeleteFile: `${API_BASE}/classroom/delete-file.php`,
    classroomDownloadFile: `${API_BASE}/classroom/download-file.php`,
    classroomShareMaterial: `${API_BASE}/classroom/share-material.php`,
    classroomStopMaterialSharing: `${API_BASE}/classroom/stop-material-sharing.php`,
    studentTeachers: `${API_BASE}/student/teachers.php`,
    findTeachers: `${API_BASE}/student/find-teachers.php`,
    studentTeacher: `${API_BASE}/student/teacher.php`,
    sendTeacherRequest: `${API_BASE}/student/send-teacher-request.php`,
    teacherStudents: `${API_BASE}/teacher/students.php`,
    teacherStudentDetails: `${API_BASE}/teacher/student-details.php`,
    updateTeacherStudentStatus: `${API_BASE}/teacher/update-student-status.php`,
    respondStudentRequest: `${API_BASE}/teacher/respond-student-request.php`,
    teacherLessonOptions: `${API_BASE}/teacher/lesson-options.php`,
    createTeacherLesson: `${API_BASE}/teacher/create-lesson.php`,
    messageDialogs: `${API_BASE}/messages/dialogs.php`,
    messageThread: `${API_BASE}/messages/thread.php`,
    sendMessage: `${API_BASE}/messages/send.php`,
    markMessagesRead: `${API_BASE}/messages/mark-read.php`,
    notifications: `${API_BASE}/notifications/index.php`,
    markNotificationsRead: `${API_BASE}/notifications/mark-read.php`,
    deleteNotification: `${API_BASE}/notifications/delete.php`,
    clearNotifications: `${API_BASE}/notifications/clear.php`,
    reviews: `${API_BASE}/reviews/index.php`,
    saveReview: `${API_BASE}/reviews/save.php`,
    replyReview: `${API_BASE}/reviews/reply.php`,
};

export function getAuthToken()
{
    return sessionStorage.getItem('gostudy_token') || '';
}

export function getAuthHeaders()
{
    const token = getAuthToken();

    return token
        ? {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
        }
        : {
            'Content-Type': 'application/json',
        };
}
