import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { TurnCredentialsService } from '../turn/turn-credentials.service';
import { ClassroomMediaController } from './classroom-media.controller';
import { ClassroomService } from './classroom.service';

describe('ClassroomMediaController', () => {
    it('requires a session and disables caching of the response', () => {
        expect(Reflect.getMetadata(GUARDS_METADATA, ClassroomMediaController))
            .toContain(SessionAuthGuard);
        expect(Reflect.getMetadata(HEADERS_METADATA, ClassroomMediaController.prototype.configuration))
            .toContainEqual({ name: 'Cache-Control', value: 'private, no-store, max-age=0' });
    });

    it('does not issue credentials when lesson authorization fails', async () => {
        const forUser = vi.fn();
        const controller = new ClassroomMediaController(
            { authorizeMedia: vi.fn().mockRejectedValue(new ForbiddenException()) } as unknown as ClassroomService,
            { forUser } as unknown as TurnCredentialsService,
        );
        await expect(controller.configuration({ id: 7 } as SessionUser, { lesson_id: 12 }))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(forUser).not.toHaveBeenCalled();
    });

    it('uses the session user id after authorizing the selected lesson', async () => {
        const authorizeMedia = vi.fn().mockResolvedValue(undefined);
        const forUser = vi.fn().mockReturnValue({ ice_servers: [], expires_at: null });
        const controller = new ClassroomMediaController(
            { authorizeMedia } as unknown as ClassroomService,
            { forUser } as unknown as TurnCredentialsService,
        );
        const user = { id: 7 } as SessionUser;
        await expect(controller.configuration(user, { lesson_id: 12 }))
            .resolves.toEqual({ success: true, ice_servers: [], expires_at: null });
        expect(authorizeMedia).toHaveBeenCalledWith(user, 12);
        expect(forUser).toHaveBeenCalledWith(7);
    });
});
