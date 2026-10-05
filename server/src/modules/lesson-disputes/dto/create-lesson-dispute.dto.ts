import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateLessonDisputeDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @IsIn([
        'no_show',
        'late_cancellation',
        'lesson_not_held',
        'lesson_quality',
        'other',
    ])
    reason:
        | 'no_show'
        | 'late_cancellation'
        | 'lesson_not_held'
        | 'lesson_quality'
        | 'other';

    @IsString()
    @MinLength(10)
    @MaxLength(5000)
    description: string;
}
