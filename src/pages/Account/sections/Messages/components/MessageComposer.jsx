import { formatFileSize } from '../../../../../api/upload.js';

export function MessageComposer({
    value,
    files,
    uploadLimits,
    uploadProgress,
    fileError,
    isSending,
    onChange,
    onFilesChange,
    onSend,
}) {
    return (
        <form
            className="message-composer"
            onSubmit={(event) => {
                event.preventDefault();
                onSend();
            }}
        >
            <div className="message-composer__body">
                <textarea
                    value={value}
                    rows="3"
                    maxLength="10000"
                    placeholder="Введите сообщение"
                    disabled={isSending}
                    onChange={(event) => onChange(event.target.value)}
                />

                {!!files.length && (
                    <div className="message-composer__files">
                        {files.map((file, index) => (
                            <span key={`${file.name}:${file.size}:${index}`}>
                                {file.name} ({formatFileSize(file.size)})
                            </span>
                        ))}
                        <button
                            type="button"
                            disabled={isSending}
                            onClick={() => onFilesChange([])}
                        >
                            Убрать файлы
                        </button>
                    </div>
                )}

                {fileError && <p className="message-composer__error">{fileError}</p>}
                {isSending && uploadProgress > 0 && (
                    <p className="message-composer__progress">
                        Отправка файлов: {uploadProgress}%
                    </p>
                )}
            </div>

            <label className="message-composer__attach">
                Прикрепить
                <input
                    type="file"
                    multiple
                    disabled={isSending}
                    onChange={(event) => {
                        onFilesChange(event.target.files);
                        event.target.value = '';
                    }}
                />
                <small>
                    До {uploadLimits.maxFiles} файлов, каждый до{' '}
                    {formatFileSize(uploadLimits.maxFileBytes)}
                </small>
            </label>

            <button
                type="submit"
                disabled={isSending || (!value.trim() && !files.length)}
            >
                {isSending ? 'Отправляем...' : 'Отправить'}
            </button>
        </form>
    );
}
