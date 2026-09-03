import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class SendMessageDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    teacher_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id: number;

    @IsIn(['student', 'parent'])
    channel_type: 'student' | 'parent';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    parent_id?: number;

    @IsOptional()
    @IsString()
    @MaxLength(10000)
    message_text?: string;
}
