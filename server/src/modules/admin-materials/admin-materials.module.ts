import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MaterialsModule } from '../materials/materials.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminMaterialsController } from './admin-materials.controller';
import { AdminMaterialsService } from './admin-materials.service';

@Module({
    imports: [AuthModule, MaterialsModule, NotificationsModule],
    controllers: [AdminMaterialsController],
    providers: [AdminMaterialsService],
})
export class AdminMaterialsModule {}
