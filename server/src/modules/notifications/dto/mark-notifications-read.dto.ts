import {
    IsBoolean,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class MarkNotificationsReadDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    notification_id?: number;

    @IsOptional()
    @IsBoolean()
    mark_all?: boolean;
}
