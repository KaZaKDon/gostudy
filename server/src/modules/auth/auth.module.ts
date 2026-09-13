import { Module } from '@nestjs/common';

import { LegalConsentsModule } from '../legal-consents/legal-consents.module';
import { MailModule } from '../mail/mail.module';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuthController } from './admin-auth.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionAuthService } from './session-auth.service';
import { SecurityService } from './security.service';

@Module({
    imports: [LegalConsentsModule, MailModule],
    controllers: [AuthController, AdminAuthController],
    providers: [
        AuthService,
        PasswordRecoveryService,
        SessionAuthService,
        SessionAuthGuard,
        AdminAccessGuard,
        SecurityService,
    ],
    exports: [
        AuthService,
        SessionAuthService,
        SessionAuthGuard,
        AdminAccessGuard,
    ],
})
export class AuthModule {}
