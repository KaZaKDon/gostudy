import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    Matches,
    Max,
    Min,
} from 'class-validator';

const JOURNAL_CURSOR_DATE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export class ListJournalQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    subject_id?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 30;

    @IsOptional()
    @Matches(JOURNAL_CURSOR_DATE)
    before_date?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    before_id?: number;
}
