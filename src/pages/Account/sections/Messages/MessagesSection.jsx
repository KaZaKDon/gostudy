import { useMemo, useState } from 'react';

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
    messages,
}) {
    const tabs = useMemo(
        () => getMessageTabsByRole(role),
        [role],
    );

    const [activeTab, setActiveTab] = useState(
        getFirstMessageTab(role),
    );

    const [selectedConversation, setSelectedConversation] =
        useState(null);

    const [draft, setDraft] = useState('');

    const conversations = useMemo(
        () =>
            getConversationsByTab(
                messages,
                activeTab,
            ),
        [messages, activeTab],
    );

    const handleOpenConversation = (
        conversation,
    ) => {
        setSelectedConversation(
            conversation,
        );
    };

    const handleCloseConversation =
        () => {
            setSelectedConversation(
                null,
            );
        };

    const handleSendMessage = () => {
        if (!draft.trim()) {
            return;
        }

        console.log(
            'send message:',
            draft,
        );

        setDraft('');
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
                onOpenConversation={
                    handleOpenConversation
                }
            />

            <ConversationModal
                role={role}
                activeTab={activeTab}
                conversation={selectedConversation}
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleSendMessage}
                onClose={handleCloseConversation}
            />
        </section>
    );
}