import { IsBoolean } from 'class-validator';

export class UpdateStudentNotificationSettingsDto {
    @IsBoolean({
        message: 'Некорректное значение настройки уведомлений',
    })
    parent_notifications_enabled: boolean;
}
