import { describe, expect, it } from 'vitest';

import { notificationCapabilities } from './notification-capabilities';

describe('notification capabilities', () => {
    it('reports only notification functions available in the current release', () => {
        expect(notificationCapabilities()).toEqual({
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
        });
    });

    it('returns a new contract object for every response', () => {
        expect(notificationCapabilities()).not.toBe(notificationCapabilities());
    });
});
