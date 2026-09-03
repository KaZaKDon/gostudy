import { IsIn } from 'class-validator';

export class ClearNotificationsDto {
    @IsIn(['read', 'all'])
    mode: 'read' | 'all';
}
