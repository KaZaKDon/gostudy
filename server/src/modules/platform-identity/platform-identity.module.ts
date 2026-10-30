import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformIdentityController, AdminPlatformIdentityController } from './platform-identity.controller';
import { PlatformIdentityService } from './platform-identity.service';
@Module({ imports: [AuthModule], controllers: [PlatformIdentityController, AdminPlatformIdentityController], providers: [PlatformIdentityService], exports: [PlatformIdentityService] })
export class PlatformIdentityModule {}
