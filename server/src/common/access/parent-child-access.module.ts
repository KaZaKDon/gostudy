import { Module } from '@nestjs/common';

import { ParentChildAccessService } from './parent-child-access.service';

@Module({
    providers: [ParentChildAccessService],
    exports: [ParentChildAccessService],
})
export class ParentChildAccessModule {}
