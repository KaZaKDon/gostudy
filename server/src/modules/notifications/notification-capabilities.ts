export type NotificationCapabilities = {
    in_app: {
        available: boolean;
        realtime_delivery_available: boolean;
    };
    parent_email: {
        delivery_available: boolean;
        preference_storage_available: boolean;
    };
    retention: {
        automatic_cleanup_available: boolean;
        manual_deletion_available: boolean;
        read_after_days: number | null;
        unread_after_days: number | null;
    };
};

export function notificationCapabilities(): NotificationCapabilities {
    return {
        in_app: {
            available: true,
            realtime_delivery_available: false,
        },
        parent_email: {
            delivery_available: false,
            preference_storage_available: true,
        },
        retention: {
            automatic_cleanup_available: false,
            manual_deletion_available: true,
            read_after_days: null,
            unread_after_days: null,
        },
    };
}
