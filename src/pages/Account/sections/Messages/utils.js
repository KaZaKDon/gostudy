import {
    STUDENT_MESSAGE_TABS,
    TEACHER_MESSAGE_TABS,
} from './constants.js';

export function getMessageTabsByRole(role) {
    return role === 'teacher'
        ? TEACHER_MESSAGE_TABS
        : STUDENT_MESSAGE_TABS;
}

export function getFirstMessageTab(role) {
    return getMessageTabsByRole(role)[0]?.id ?? null;
}

export function getConversationsByTab(messages, activeTab) {
    return messages[activeTab] ?? [];
}

export function getFirstConversation(conversations) {
    return conversations[0] ?? null;
}

export function getConversationById(conversations, conversationId) {
    return (
        conversations.find(
            (conversation) => conversation.id === conversationId,
        ) ?? getFirstConversation(conversations)
    );
}