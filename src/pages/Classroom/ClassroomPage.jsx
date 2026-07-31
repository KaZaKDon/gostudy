import {
    useEffect,
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
} from 'react-router-dom';

import { ClassroomHeader } from './components/ClassroomHeader.jsx';
import { ClassroomChat } from './components/ClassroomChat.jsx';
import { ClassroomSidePanel } from './components/ClassroomSidePanel.jsx';
import { ClassroomWorkspace } from './components/ClassroomWorkspace.jsx';
import { ClassroomTools } from './components/ClassroomTools.jsx';
import { FinishLessonModal } from './components/FinishLessonModal.jsx';
import { useClassroom } from './hooks/useClassroom.js';
import { useClassroomFilePreview } from './hooks/useClassroomFilePreview.js';

import './ClassroomPage.css';

export function ClassroomPage() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const classroomController = useClassroom(lessonId);
    const [activeTool, setActiveTool] = useState('lesson');
    const [activePanel, setActivePanel] = useState('materials');
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [localMaterialPages, setLocalMaterialPages] = useState({});
    const [detachedShareVersion, setDetachedShareVersion] = useState(null);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const classroomData = classroomController.classroom;
    const classroomFiles = Array.isArray(classroomData?.files)
        ? classroomData.files
        : [];
    const workspaceState = classroomData?.workspace || {
        is_sharing: false,
        file_id: null,
        page: 1,
        version: 0,
    };
    const viewerRole = classroomData?.viewer?.role || '';
    const selectedFile = classroomFiles.find(
        (file) => Number(file.id) === Number(selectedFileId),
    ) || null;
    const sharedFile = classroomFiles.find(
        (file) => Number(file.id) === Number(workspaceState.file_id),
    ) || null;
    const isFollowingShare = viewerRole === 'student'
        && workspaceState.is_sharing
        && Number(detachedShareVersion) !== Number(workspaceState.version);
    const displayedFile = isFollowingShare
        ? sharedFile
        : selectedFile || (viewerRole === 'teacher' ? sharedFile : null);
    const isDisplayingSharedFile = workspaceState.is_sharing
        && Number(displayedFile?.id) === Number(workspaceState.file_id);
    const materialPage = isDisplayingSharedFile
        ? Math.max(1, Number(workspaceState.page) || 1)
        : Math.max(1, Number(localMaterialPages[displayedFile?.id]) || 1);
    const filePreview = useClassroomFilePreview(displayedFile);
    const effectiveActiveTool = isFollowingShare ? 'material' : activeTool;

    useEffect(() => {
        const storedTheme = localStorage.getItem('gostudy-theme');

        if (storedTheme === 'light' || storedTheme === 'dark') {
            document.documentElement.dataset.theme = storedTheme;
        }
    }, []);

    const handleBackToAccount = () => {
        navigate('/account?section=classroom');
    };

    const handleOpenHomework = (homeworkId) => {
        navigate(`/account?section=homework&homework=${Number(homeworkId)}`);
    };

    const handleCreateHomework = () => {
        const lesson = classroomController.classroom?.lesson;
        const params = new URLSearchParams({
            section: 'homework',
            create: '1',
            lesson: String(lesson.id),
        });

        if (lesson.relation_id) {
            params.set('relation', String(lesson.relation_id));
        }

        navigate(`/account?${params.toString()}`);
    };

    const handleOpenJournal = () => {
        navigate(`/account?section=journal&lesson=${Number(lessonId)}`);
    };

    const handleSelectFile = (file) => {
        setSelectedFileId(Number(file.id));

        if (viewerRole === 'student' && workspaceState.is_sharing) {
            setDetachedShareVersion(Number(workspaceState.version));
        }

        setActiveTool('material');
    };

    const handleToolChange = (toolId) => {
        if (
            viewerRole === 'student'
            && isFollowingShare
            && toolId !== 'material'
        ) {
            setDetachedShareVersion(Number(workspaceState.version));
        }

        setActiveTool(toolId);
    };

    const handleShareMaterial = (file) => {
        const page = Math.max(
            1,
            Number(localMaterialPages[file.id]) || materialPage || 1,
        );

        classroomController.shareMaterial(file.id, page).catch(() => {});
    };

    const handleStopMaterialSharing = () => {
        classroomController.stopMaterialSharing().catch(() => {});
    };

    const handleReturnToSharedMaterial = () => {
        setDetachedShareVersion(null);
        setActiveTool('material');
    };

    const handleMaterialPageChange = (nextPage) => {
        if (!displayedFile) {
            return;
        }

        const safePage = Math.max(1, Number(nextPage) || 1);

        if (viewerRole === 'teacher' && isDisplayingSharedFile) {
            classroomController
                .shareMaterial(displayedFile.id, safePage)
                .catch(() => {});
            return;
        }

        setLocalMaterialPages((current) => ({
            ...current,
            [displayedFile.id]: safePage,
        }));
    };

    const handleFinish = async () => {
        try {
            await classroomController.finishLesson();
            setIsFinishModalOpen(false);
            setActiveTool('lesson');
        } catch {
            // Текст ошибки показывает контроллер внутри модального окна.
        }
    };

    if (classroomController.status === 'loading') {
        return (
            <main className="classroom-page classroom-page--centered">
                <div className="classroom-state-card">
                    <h1>Загружаем класс...</h1>
                </div>
            </main>
        );
    }

    if (
        classroomController.status === 'error'
        || !classroomController.classroom
    ) {
        return (
            <main className="classroom-page classroom-page--centered">
                <div className="classroom-state-card">
                    <h1>Класс недоступен</h1>
                    <p>{classroomController.errorMessage}</p>
                    <div>
                        <button
                            type="button"
                            onClick={classroomController.retry}
                        >
                            Повторить
                        </button>
                        <button type="button" onClick={handleBackToAccount}>
                            Вернуться в кабинет
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const {
        viewer,
        lesson,
        session,
        access,
        messages,
        files,
        homework,
        teacherNote,
        uploadLimits,
    } = classroomController.classroom;

    return (
        <main className={`classroom-page classroom-page--${viewer.role}`}>
            <ClassroomHeader
                lesson={lesson}
                session={session}
                access={access}
                role={viewer.role}
                isSaving={classroomController.isSaving}
                onBack={handleBackToAccount}
                onStart={() => classroomController.startLesson().catch(() => {})}
                onFinish={() => {
                    classroomController.clearActionError();
                    setIsFinishModalOpen(true);
                }}
            />

            {classroomController.actionError && !isFinishModalOpen && (
                <p className="classroom-page__error" role="alert">
                    {classroomController.actionError}
                </p>
            )}

            <section className="classroom-page__layout">
                <aside className="classroom-page__side">
                    <ClassroomChat
                        messages={messages}
                        canSend={access.can_chat}
                        isSaving={classroomController.isSaving}
                        onSend={classroomController.sendMessage}
                    />

                    <ClassroomSidePanel
                        role={viewer.role}
                        activePanel={activePanel}
                        files={files}
                        homework={homework}
                        teacherNote={teacherNote}
                        uploadLimits={uploadLimits}
                        canManageFiles={access.can_manage_files}
                        isSaving={classroomController.isSaving}
                        onChangePanel={setActivePanel}
                        onSelectFile={handleSelectFile}
                        onOpenHomework={handleOpenHomework}
                        onCreateHomework={handleCreateHomework}
                        onSaveNote={classroomController.saveNote}
                        onUploadFiles={classroomController.uploadFiles}
                        onDeleteFile={classroomController.deleteFile}
                        onDownloadFile={classroomController.downloadFile}
                    />
                </aside>

                <section className="classroom-page__main">
                    <ClassroomWorkspace
                        activeTool={effectiveActiveTool}
                        lesson={lesson}
                        session={session}
                        access={access}
                        selectedFile={displayedFile}
                        filePreview={filePreview}
                        workspace={workspaceState}
                        sharedFile={sharedFile}
                        isFollowingShare={isFollowingShare}
                        materialPage={materialPage}
                        canChangeMaterialPage={
                            !isFollowingShare && !classroomController.isSaving
                        }
                        isSaving={classroomController.isSaving}
                        role={viewer.role}
                        onDownloadFile={(file) =>
                            classroomController.downloadFile(file).catch(() => {})}
                        onRetryFilePreview={filePreview.retry}
                        onShareMaterial={handleShareMaterial}
                        onStopMaterialSharing={handleStopMaterialSharing}
                        onReturnToSharedMaterial={handleReturnToSharedMaterial}
                        onMaterialPageChange={handleMaterialPageChange}
                        onOpenJournal={handleOpenJournal}
                        onCreateHomework={handleCreateHomework}
                        onBackToAccount={handleBackToAccount}
                    />

                    <ClassroomTools
                        activeTool={effectiveActiveTool}
                        onChangeTool={handleToolChange}
                    />
                </section>
            </section>

            {isFinishModalOpen && (
                <FinishLessonModal
                    isSaving={classroomController.isSaving}
                    errorMessage={classroomController.actionError}
                    onClose={() => setIsFinishModalOpen(false)}
                    onFinish={handleFinish}
                />
            )}
        </main>
    );
}
