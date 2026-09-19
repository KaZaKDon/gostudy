import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { AuthModule } from '../auth/auth.module';
import { TeacherProfileMediaModule } from './teacher-profile-media.module';

describe('TeacherProfileMediaModule', () => {
    it('imports the authentication providers used by protected routes', () => {
        const imports = Reflect.getMetadata(
            MODULE_METADATA.IMPORTS,
            TeacherProfileMediaModule,
        ) as unknown[];

        expect(imports).toContain(AuthModule);
    });
});
