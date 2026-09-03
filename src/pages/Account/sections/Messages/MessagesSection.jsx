import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { validateSelectedFiles } from '../../../../api/upload.js';

import {
    getConversationsByTab,
    getFirstMessageTab,
    getMessageTabsByRole,
} from './utils.js';

import { MessagesTabs } from './components/MessagesTabs.jsx';
import { ConversationList } from './components/ConversationList.jsx';
import { ConversationModal } from './components/ConversationModal.jsx';

import './MessagesSection.css';

export function MessagesSection({
    role,
    messagesController,
    messageTarget,
}) {
    const {
        dialogs,
        dialogsStatus,
        dialogsError,
        selectedConversation,
        threadMessages,
        threadStatus,
        threadError,
        hasMore,
        sendStatus,
        uploadLimits,
        reloadDialogs,
        openConversation,
        closeConversation,
        loadOlderMessages,
        sendMessage,
        downloadAttachment,
        reportMessage,
    } = messagesController;

    const tabs = useMemo(
        () => getMessageTabsByRole(role),
        [role],
    );

    const [activeTab, setActiveTab] = useState(
        getFirstMessageTab(role),
    );

    const [draft, setDraft] = useState('');
    const [files, setFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState('');
    const [reportTarget, setReportTarget] = useState(null);
    const [reportReason, setReportReason] = useState('spam');
    const [reportComment, setReportComment] = useState('');
    const [reportStatus, setReportStatus] = useState('idle');
    const [reportNotice, setReportNotice] = useState('');
    const openedTargetRef = useRef(null);

    const conversations = useMemo(
        () =>
            getConversationsByTab(
                dialogs,
                activeTab,
            ),
        [dialogs, activeTab],
    );

    useEffect(() => {
        if (!reportTarget) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setReportTarget(null);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [reportTarget]);

    useEffect(() => {
        if (
            !messageTarget
            || openedTargetRef.current === messageTarget.requestId
        ) {
            return;
        }

        const conversation = dialogs.find((dialog) => {
            if (messageTarget.dialogId) {
                return dialog.id === Number(messageTarget.dialogId);
            }

            return (
                dialog.studentId === Number(messageTarget.studentId)
                && dialog.channelType === messageTarget.channelType
            );
        });

        if (!conversation) {
            return;
        }

        const openId = window.setTimeout(() => {
            openedTargetRef.current = messageTarget.requestId;
            setActiveTab(conversation.tabId);
            setDraft('');
            setFiles([]);
            openConversation(conversation);
        }, 0);

        return () => window.clearTimeout(openId);
    }, [dialogs, messageTarget, openConversation]);

    const handleOpenConversation = (
        conversation,
    ) => {
        setDraft('');
        setFiles([]);
        setFileError('');
        setUploadProgress(0);
        openConversation(conversation);
    };

    const handleCloseConversation =
        () => {
            setDraft('');
            setFiles([]);
            setFileError('');
            setUploadProgress(0);
            closeConversation();
        };

    const handleSendMessage = async () => {
        const messageText = draft.trim();

        if (!messageText && !files.length) {
            return;
        }

        const isSent = await sendMessage(
            messageText,
            files,
            setUploadProgress,
        );

        if (isSent) {
            setDraft('');
            setFiles([]);
            setUploadProgress(0);
        }
    };

    const handleFilesChange = (selected) => {
        setFileError('');
        try {
            setFiles(validateSelectedFiles(selected, uploadLimits));
        } catch (error) {
            setFiles([]);
            setFileError(error.message || 'Не удалось прикрепить файлы');
        }
    };

    const handleReportOpen = (message) => {
        setReportTarget(message);
        setReportReason('spam');
        setReportComment('');
        setReportNotice('');
        setReportStatus('idle');
    };

    const handleReportSubmit = async () => {
        if (!reportTarget || reportStatus === 'loading') return;
        setReportStatus('loading');
        setReportNotice('');
        try {
            const notice = await reportMessage(
                reportTarget.id,
                reportReason,
                reportComment.trim(),
            );
            setReportNotice(notice);
            setReportStatus('success');
        } catch (error) {
            setReportNotice(error.message || 'Не удалось отправить жалобу');
            setReportStatus('error');
        }
    };

    return (
        <section className="messages-section">
            <header className="messages-section__header">
                <div>
                    <span>
                        Сообщения
                    </span>

                    <h2>
                        Диалоги
                    </h2>
                </div>
            </header>

            <MessagesTabs
                tabs={tabs}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
            />

            <ConversationList
                conversations={
                    conversations
                }
                status={dialogsStatus}
                errorMessage={dialogsError}
                onOpenConversation={
                    handleOpenConversation
                }
                onRetry={reloadDialogs}
            />

            <ConversationModal
                role={role}
                activeTab={activeTab}
                conversation={selectedConversation}
                messages={threadMessages}
                threadStatus={threadStatus}
                errorMessage={threadError}
                hasMore={hasMore}
                sendStatus={sendStatus}
                draft={draft}
                files={files}
                uploadLimits={uploadLimits}
                uploadProgress={uploadProgress}
                fileError={fileError}
                suspendKeyboardClose={Boolean(reportTarget)}
                onDraftChange={setDraft}
                onFilesChange={handleFilesChange}
                onSend={handleSendMessage}
                onDownloadAttachment={downloadAttachment}
                onReportMessage={handleReportOpen}
                onLoadOlder={loadOlderMessages}
                onClose={handleCloseConversation}
            />

            {reportTarget && (
                <div className="message-report-modal">
                    <button
                        type="button"
                        className="message-report-modal__overlay"
                        aria-label="Закрыть жалобу"
                        onClick={() => setReportTarget(null)}
                    />
                    <section
                        className="message-report-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="message-report-title"
                    >
                        <h3 id="message-report-title">Пожаловаться на сообщение</h3>
                        <label>
                            Причина
                            <select
                                value={reportReason}
                                disabled={reportStatus === 'loading'}
                                onChange={(event) => setReportReason(event.target.value)}
                            >
                                <option value="spam">Спам</option>
                                <option value="abuse">Оскорбление или травля</option>
                                <option value="inappropriate">Недопустимый материал</option>
                                <option value="threat">Угроза</option>
                                <option value="other">Другая причина</option>
                            </select>
                        </label>
                        <label>
                            Комментарий (необязательно)
                            <textarea
                                rows="4"
                                maxLength="3000"
                                value={reportComment}
                                disabled={reportStatus === 'loading'}
                                onChange={(event) => setReportComment(event.target.value)}
                            />
                        </label>
                        {reportNotice && (
                            <p className={`message-report-modal__notice message-report-modal__notice--${reportStatus}`}>
                                {reportNotice}
                            </p>
                        )}
                        <div className="message-report-modal__actions">
                            <button type="button" onClick={() => setReportTarget(null)}>
                                {reportStatus === 'success' ? 'Закрыть' : 'Отмена'}
                            </button>
                            {reportStatus !== 'success' && (
                                <button
                                    type="button"
                                    disabled={reportStatus === 'loading'}
                                    onClick={handleReportSubmit}
                                >
                                    {reportStatus === 'loading' ? 'Отправляем...' : 'Отправить жалобу'}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
