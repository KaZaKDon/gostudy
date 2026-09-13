export function ClassroomScreenShare({
    role,
    mediaStatus,
    isScreenSharing,
    isRemoteScreenSharing,
    errorMessage,
    localVideoRef,
    remoteVideoRef,
    onJoin,
    onStart,
    onStop,
}) {
    const isJoined = mediaStatus !== 'idle' && mediaStatus !== 'error';
    const videoRef = role === 'teacher' ? localVideoRef : remoteVideoRef;
    const isShowing = role === 'teacher'
        ? isScreenSharing
        : isRemoteScreenSharing;

    return (
        <section className="classroom-screen-share">
            <div className="classroom-screen-share__heading">
                <div>
                    <span>Демонстрация экрана</span>
                    <strong>
                        {isShowing
                            ? 'Экран показывается'
                            : 'Показ экрана не запущен'}
                    </strong>
                </div>

                {!isJoined ? (
                    <button
                        type="button"
                        onClick={() => onJoin(role === 'teacher' ? 'camera' : 'observer')}
                    >
                        {role === 'teacher'
                            ? 'Подключиться к уроку'
                            : 'Подключиться для просмотра'}
                    </button>
                ) : role === 'teacher' && !isScreenSharing ? (
                    <button type="button" onClick={onStart}>
                        Показать экран
                    </button>
                ) : role === 'teacher' ? (
                    <button type="button" className="is-danger" onClick={onStop}>
                        Остановить показ
                    </button>
                ) : null}
            </div>

            {errorMessage && (
                <p className="classroom-inline-error" role="alert">
                    {errorMessage}
                </p>
            )}

            <div className={isShowing
                ? 'classroom-screen-share__stage is-active'
                : 'classroom-screen-share__stage'}
            >
                <video ref={videoRef} autoPlay muted={role === 'teacher'} playsInline />

                {!isShowing && (
                    <div className="classroom-screen-share__empty">
                        <strong>
                            {role === 'teacher'
                                ? 'Выберите окно, вкладку или весь экран'
                                : 'Ожидаем показ преподавателя'}
                        </strong>
                        <p>
                            {role === 'teacher'
                                ? 'Браузер сам откроет безопасное окно выбора.'
                                : 'Изображение появится здесь автоматически.'}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
