import { ClassroomCalculator } from './ClassroomCalculator.jsx';
import { ClassroomFilePreview } from './ClassroomFilePreview.jsx';
import { ClassroomVideo } from './ClassroomVideo.jsx';
import { ClassroomScreenShare } from './ClassroomScreenShare.jsx';
import { ClassroomBoard } from './ClassroomBoard.jsx';
import {
    formatClassroomDateTime,
    getClassroomFilePreviewKind,
    getClassroomStatusLabel,
} from '../utils/classroom.js';

export function ClassroomWorkspace({
    activeTool,
    lesson,
    session,
    access,
    selectedFile,
    filePreview,
    workspace,
    sharedFile,
    isFollowingShare,
    materialPage,
    canChangeMaterialPage,
    isSaving,
    role,
    onDownloadFile,
    onRetryFilePreview,
    onShareMaterial,
    onStopMaterialSharing,
    onReturnToSharedMaterial,
    onMaterialPageChange,
    onOpenJournal,
    onCreateHomework,
    onBackToAccount,
    media,
    viewerName,
    viewerId,
    board,
}) {
    if (activeTool === 'calculator') {
        return (
            <section className="classroom-workspace">
                <ClassroomCalculator />
            </section>
        );
    }

    if (activeTool === 'material') {
        const isSharedFile = workspace.is_sharing
            && Number(workspace.file_id) === Number(selectedFile?.id);
        const canPreviewSelectedFile = selectedFile
            && getClassroomFilePreviewKind(selectedFile) !== 'unsupported';

        return (
            <section className="classroom-workspace">
                <div className="classroom-workspace__screen classroom-workspace__screen--material">
                    <span className="classroom-workspace__label">
                        Материал урока
                    </span>

                    <div className="classroom-shared-material">
                        {role === 'teacher' && workspace.is_sharing && (
                            <span>
                                Ученику показывается: {sharedFile?.original_name
                                    || 'материал'}
                            </span>
                        )}

                        {role === 'teacher'
                            && selectedFile
                            && access.can_share_material
                            && !isSharedFile
                            && canPreviewSelectedFile && (
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => onShareMaterial(selectedFile)}
                            >
                                Показать ученику
                            </button>
                        )}

                        {role === 'teacher' && workspace.is_sharing && (
                            <button
                                type="button"
                                className="is-secondary"
                                disabled={isSaving}
                                onClick={onStopMaterialSharing}
                            >
                                Остановить показ
                            </button>
                        )}

                        {role === 'student'
                            && workspace.is_sharing
                            && isFollowingShare && (
                            <span>
                                Преподаватель показывает материал
                            </span>
                        )}

                        {role === 'student'
                            && workspace.is_sharing
                            && !isFollowingShare && (
                            <button
                                type="button"
                                onClick={onReturnToSharedMaterial}
                            >
                                Вернуться к показу преподавателя
                            </button>
                        )}
                    </div>

                    <ClassroomFilePreview
                        file={selectedFile}
                        preview={filePreview}
                        onRetry={onRetryFilePreview}
                        onDownload={onDownloadFile}
                        page={materialPage}
                        canChangePage={canChangeMaterialPage}
                        onPageChange={onMaterialPageChange}
                    />
                </div>
            </section>
        );
    }

    if (activeTool === 'video') {
        const participantName = role === 'teacher'
            ? lesson.student.name
            : lesson.teacher.name;

        return (
            <section className="classroom-workspace">
                <div className="classroom-workspace__screen classroom-workspace__screen--video">
                    <ClassroomVideo
                        status={media.status}
                        errorMessage={media.errorMessage}
                        isMicrophoneEnabled={media.isMicrophoneEnabled}
                        isCameraEnabled={media.isCameraEnabled}
                        joinMode={media.joinMode}
                        hasMicrophone={media.hasMicrophone}
                        hasCamera={media.hasCamera}
                        localVideoRef={media.localVideoRef}
                        remoteVideoRef={media.remoteVideoRef}
                        onJoin={media.join}
                        onLeave={media.leave}
                        onToggleMicrophone={media.toggleMicrophone}
                        onToggleCamera={media.toggleCamera}
                        participantName={participantName}
                        viewerName={viewerName}
                        isLessonActive={session.status === 'active'}
                    />
                </div>
            </section>
        );
    }

    if (activeTool === 'screen') {
        return (
            <section className="classroom-workspace">
                <div className="classroom-workspace__screen classroom-workspace__screen--video">
                    <ClassroomScreenShare
                        role={role}
                        mediaStatus={media.status}
                        isScreenSharing={media.isScreenSharing}
                        isRemoteScreenSharing={media.isRemoteScreenSharing}
                        errorMessage={media.screenErrorMessage}
                        localVideoRef={media.localVideoRef}
                        remoteVideoRef={media.remoteVideoRef}
                        onJoin={media.join}
                        onStart={media.startScreenShare}
                        onStop={media.stopScreenShare}
                    />
                </div>
            </section>
        );
    }

    if (activeTool === 'board') {
        return (
            <section className="classroom-workspace">
                <div className="classroom-workspace__screen classroom-workspace__screen--board">
                    <ClassroomBoard
                        board={board}
                        canDraw={session.status === 'active'}
                        canClear={role === 'teacher' && session.status === 'active'}
                        viewerId={viewerId}
                        isTeacher={role === 'teacher'}
                    />
                </div>
            </section>
        );
    }

    const teacherPresence = session.teacher_present
        ? 'в классе'
        : 'не в классе';
    const studentPresence = session.student_present
        ? 'в классе'
        : 'не в классе';

    return (
        <section className="classroom-workspace">
            <div className="classroom-workspace__screen">
                <span className="classroom-workspace__label">
                    {lesson.subject_name}
                </span>

                <div className="classroom-workspace__lesson">
                    <span>{getClassroomStatusLabel(session.status)}</span>
                    <h2>{lesson.topic}</h2>
                    <p>
                        {formatClassroomDateTime(lesson.lesson_date)} ·{' '}
                        {lesson.duration_minutes} минут
                    </p>

                    {access.reason && session.status !== 'active' && (
                        <p className="classroom-workspace__reason">
                            {access.reason}
                        </p>
                    )}

                    <div className="classroom-workspace__presence">
                        <div className={session.teacher_present ? 'is-online' : ''}>
                            <strong>{lesson.teacher.name}</strong>
                            <span>Преподаватель · {teacherPresence}</span>
                        </div>
                        <div className={session.student_present ? 'is-online' : ''}>
                            <strong>{lesson.student.name}</strong>
                            <span>Ученик · {studentPresence}</span>
                        </div>
                    </div>

                    {session.status === 'waiting' && access.can_join && (
                        <p>
                            {role === 'teacher'
                                ? 'Запустите урок кнопкой в верхней панели.'
                                : 'Ожидаем, когда преподаватель начнёт урок.'}
                        </p>
                    )}

                    {session.status === 'active' && (
                        <p>
                            Урок начат. Чат, материалы, домашнее задание и
                            заметки доступны в левой панели.
                        </p>
                    )}

                    {session.status === 'ended' && (
                        <div className="classroom-workspace__completion">
                            <p>
                                Занятие завершено. Переписка и материалы
                                сохранены в классе.
                            </p>

                            {role === 'teacher' ? (
                                <>
                                    <button type="button" onClick={onOpenJournal}>
                                        Заполнить журнал
                                    </button>
                                    <button type="button" onClick={onCreateHomework}>
                                        Выдать домашнее задание
                                    </button>
                                </>
                            ) : null}

                            <button type="button" onClick={onBackToAccount}>
                                Вернуться в кабинет
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
