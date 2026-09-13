import {
    PARENT_MESSAGE_TABS,
    STUDENT_MESSAGE_TABS,
    TEACHER_MESSAGE_TABS,
} from './constants.js';

export function getMessageTabsByRole(role) {
    if (role === 'teacher') return TEACHER_MESSAGE_TABS;
    if (role === 'parent') return PARENT_MESSAGE_TABS;
    return STUDENT_MESSAGE_TABS;
}

export function getFirstMessageTab(role) {
    return getMessageTabsByRole(role)[0]?.id ?? null;
}

export function getConversationsByTab(messages, activeTab) {
    return messages.filter(
        (conversation) => conversation.tabId === activeTab,
    );
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

function parseApiDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(String(value).replace(' ', 'T'));

    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(left, right) {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function formatClock(date) {
    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatConversationTime(value) {
    const date = parseApiDate(value);

    if (!date) {
        return '';
    }

    const now = new Date();

    if (isSameDay(date, now)) {
        return formatClock(date);
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (isSameDay(date, yesterday)) {
        return 'Вчера';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
    }).format(date);
}

export function formatMessageTime(value) {
    const date = parseApiDate(value);

    if (!date) {
        return '';
    }

    const now = new Date();

    if (isSameDay(date, now)) {
        return formatClock(date);
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function getTabId(role, channelType) {
    if (role === 'teacher') {
        return channelType === 'parent' ? 'parents' : 'students';
    }

    if (role === 'parent') {
        return channelType === 'student' ? 'children' : 'teachers';
    }

    return 'teachers';
}

export function mapConversation(dialog, role) {
    return {
        id: dialog.id ?? null,
        key: String(dialog.key),
        teacherId: Number(dialog.teacher_id),
        studentId: Number(dialog.student_id),
        parentId: dialog.parent_id ? Number(dialog.parent_id) : null,
        channelType: dialog.channel_type,
        tabId: getTabId(role, dialog.channel_type),
        name: dialog.display_name || 'Диалог',
        subtitle: dialog.subtitle || '',
        avatarUrl: dialog.avatar_url || '',
        lastMessage: dialog.last_message || 'Переписка пока не начата.',
        lastMessageAt: dialog.last_message_at || null,
        time: formatConversationTime(dialog.last_message_at),
        unreadCount: Number(dialog.unread_count) || 0,
        canSend: Boolean(dialog.can_send),
        parentAccessNotice: dialog.parent_access_notice || '',
    };
}

export function mapMessage(message) {
    return {
        id: Number(message.id),
        senderId: Number(message.sender_id),
        authorType: message.sender_context,
        authorName: message.author_name || 'Пользователь',
        text: message.message_text || '',
        isRead: Boolean(message.is_read),
        isOwn: Boolean(message.is_own),
        isHidden: Boolean(message.is_hidden),
        attachments: Array.isArray(message.attachments)
            ? message.attachments.map((attachment) => ({
                id: Number(attachment.id),
                originalName: attachment.original_name || 'Файл',
                mimeType: attachment.mime_type || '',
                fileSize: Number(attachment.file_size) || 0,
            }))
            : [],
        createdAt: message.created_at || null,
        time: formatMessageTime(message.created_at),
    };
}
