import type { Prisma } from '../../generated/prisma/client';

export type NotificationWriteClient = Prisma.TransactionClient;

export type CreateNotificationInput = {
    userId: number;
    type: string;
    title: string;
    message: string;
    targetSection?: string | null;
    targetEntityType?: string | null;
    targetEntityId?: number | null;
    targetDate?: string | null;
    dedupeKey?: string | null;
};

export type CreateParentNotificationInput = Omit<
    CreateNotificationInput,
    'userId'
> & {
    category: ParentNotificationCategory;
};

export type ParentNotificationCategory =
    | 'homework'
    | 'diary'
    | 'schedule'
    | 'messages';
