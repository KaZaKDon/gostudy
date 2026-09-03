import { IsInt, Min } from 'class-validator';

export class DeleteNotificationDto {
    @IsInt()
    @Min(1)
    notification_id: number;
}
