import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    Min,
} from 'class-validator';

export class UpdateParentNotificationSettingsDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id: number;

    @IsBoolean()
    homework_enabled: boolean;

    @IsBoolean()
    diary_enabled: boolean;

    @IsBoolean()
    schedule_enabled: boolean;

    @IsBoolean()
    messages_enabled: boolean;
}
