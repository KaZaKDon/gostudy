import { useRef, useState } from 'react';

const STATUS_LABELS = {
    idle: 'Камера и микрофон выключены',
    requesting: 'Запрашиваем доступ...',
    waiting: 'Ожидаем второго участника',
    connected: 'Участники подключены',
    error: 'Видеосвязь не подключена',
};

export function ClassroomVideo({
    status,
    errorMessage,
    isMicrophoneEnabled,
    isCameraEnabled,
    joinMode,
    hasMicrophone,
    hasCamera,
    localVideoRef,
    remoteVideoRef,
    onJoin,
    onLeave,
    onToggleMicrophone,
    onToggleCamera,
    participantName,
    viewerName,
    isLessonActive,
}) {
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    const previewToggleRef = useRef(null);
    const isJoined = status !== 'idle' && status !== 'error';

    return (
        <section className="classroom-video">
            <div className="classroom-video__heading">
                <div>
                    <span>Видеосвязь урока</span>
                    <strong>{STATUS_LABELS[status]}</strong>
                </div>

                {!isJoined ? (
                    <div className="classroom-video__join-options">
                        <button type="button" disabled={!isLessonActive || status === 'requesting'} onClick={() => onJoin('camera')}>
                            Камера и микрофон
                        </button>
                        <button type="button" disabled={!isLessonActive || status === 'requesting'} onClick={() => onJoin('audio')}>
                            Только микрофон
                        </button>
                        <button type="button" disabled={!isLessonActive || status === 'requesting'} onClick={() => onJoin('observer')}>
                            Только просмотр
                        </button>
                    </div>
                ) : (
                    <button type="button" className="is-danger" onClick={onLeave}>
                        Отключиться
                    </button>
                )}
            </div>

            {!isLessonActive && (
                <p className="classroom-inline-notice">
                    Видеосвязь станет доступна после начала урока.
                </p>
            )}

            {errorMessage && (
                <p className="classroom-inline-error" role="alert">
                    {errorMessage}
                </p>
            )}

            <div className="classroom-video__stage">
                <figure className="classroom-video__remote">
                    <video ref={remoteVideoRef} autoPlay playsInline />
                    <figcaption>{participantName}</figcaption>
                </figure>
                {/* Keep the video mounted: hiding a preview must not stop its stream. */}
                <figure className="classroom-video__local" hidden={!isPreviewVisible}>
                    <button
                        type="button"
                        className="classroom-video__hide-preview"
                        aria-label="Скрыть своё видео"
                        title="Скрыть превью — камера продолжит работать"
                        onClick={() => {
                            setIsPreviewVisible(false);
                            previewToggleRef.current?.focus();
                        }}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                    />
                    <figcaption>{viewerName} · вы</figcaption>
                </figure>
            </div>

            <div className="classroom-video__controls">
                <button
                    ref={previewToggleRef}
                    type="button"
                    aria-pressed={isPreviewVisible}
                    onClick={() => setIsPreviewVisible((visible) => !visible)}
                >
                    {isPreviewVisible ? 'Скрыть своё видео' : 'Показать своё видео'}
                </button>
                {isJoined && (
                    <>
                        <button type="button" disabled={!hasMicrophone} onClick={onToggleMicrophone}>
                            {isMicrophoneEnabled
                                ? 'Выключить микрофон'
                                : 'Включить микрофон'}
                        </button>
                        <button type="button" disabled={!hasCamera} onClick={onToggleCamera}>
                            {isCameraEnabled
                                ? 'Выключить камеру'
                                : 'Включить камеру'}
                        </button>
                        {joinMode === 'observer' && <span>Подключено без камеры и микрофона</span>}
                    </>
                )}
            </div>
        </section>
    );
}
