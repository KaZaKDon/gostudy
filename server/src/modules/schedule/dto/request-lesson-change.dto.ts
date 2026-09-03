import { Transform } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';

export class RequestLessonChangeDto {
    @IsInt()
    @Min(1)
    lesson_id: number;

    @Transform(({ value }) => typeof value === 'string'
        ? value.trim().toLowerCase()
        : value)
    @IsIn(['reschedule', 'cancel'])
    request_type: 'reschedule' | 'cancel';

    @IsOptional()
    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(30)
    proposed_lesson_date?: string | null;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @MaxLength(2000)
    comment: string;
}
