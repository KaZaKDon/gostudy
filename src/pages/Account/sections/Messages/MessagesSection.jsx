import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

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
        reloadDialogs,
        openConversation,
        closeConversation,
        loadOlderMessages,
        sendMessage,
    } = messagesController;

    const tabs = useMemo(
        () => getMessageTabsByRole(role),
        [role],
    );

    const [activeTab, setActiveTab] = useState(
        getFirstMessageTab(role),
    );

    const [draft, setDraft] = useState('');
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
            openConversation(conversation);
        }, 0);

        return () => window.clearTimeout(openId);
    }, [dialogs, messageTarget, openConversation]);

    const handleOpenConversation = (
        conversation,
    ) => {
        setDraft('');
        openConversation(conversation);
    };

    const handleCloseConversation =
        () => {
            setDraft('');
            closeConversation();
        };

    const handleSendMessage = async () => {
        const messageText = draft.trim();

        if (!messageText) {
            return;
        }

        const isSent = await sendMessage(messageText);

        if (isSent) {
            setDraft('');
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
                onDraftChange={setDraft}
                onSend={handleSendMessage}
                onLoadOlder={loadOlderMessages}
                onClose={handleCloseConversation}
            />
        </section>
    );
}
