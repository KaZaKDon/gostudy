import { ClassroomCalculator } from './ClassroomCalculator.jsx';
import { ClassroomFilePreview } from './ClassroomFilePreview.jsx';
import {
    formatClassroomDateTime,
    getClassroomFilePreviewKind,
    getClassroomStatusLabel,
} from '../utils/classroom.js';

const FUTURE_TOOLS = {
    video: {
        title: 'Видеосвязь',
        text: 'Модуль будет подключён к отдельному видеосерверу. Основа класса от него не зависит.',
    },
    screen: {
        title: 'Демонстрация экрана',
        text: 'Показ экрана станет доступен вместе с модулем видеосвязи.',
    },
    board: {
        title: 'Совместная доска',
        text: 'Синхронная доска будет подключена после развёртывания сервера реального времени.',
    },
};

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

    if (FUTURE_TOOLS[activeTool]) {
        const content = FUTURE_TOOLS[activeTool];

        return (
            <section className="classroom-workspace">
                <div className="classroom-workspace__screen">
                    <span className="classroom-workspace__label">
                        Следующий этап
                    </span>
                    <div className="classroom-workspace__placeholder">
                        <strong>{content.title}</strong>
                        <p>{content.text}</p>
                    </div>
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
