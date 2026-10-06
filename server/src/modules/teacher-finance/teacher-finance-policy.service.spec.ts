import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { TeacherFinancePolicyService } from './teacher-finance-policy.service';

describe('TeacherFinancePolicyService', () => {
    it('keeps lesson settlements disabled by default', () => {
        const policy = new TeacherFinancePolicyService(new ConfigService({}));

        expect(policy.isLessonSettlementsEnabled()).toBe(false);
        expect(policy.publicState()).toMatchObject({
            enabled: false,
            mode: 'direct',
        });
    });

    it('can restore the preserved model with an explicit switch', () => {
        const policy = new TeacherFinancePolicyService(new ConfigService({
            LESSON_SETTLEMENTS_ENABLED: true,
        }));

        expect(policy.isLessonSettlementsEnabled()).toBe(true);
        expect(policy.publicState()).toMatchObject({
            enabled: true,
            mode: 'platform',
        });
    });
});
