import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export const JOURNAL_ATTENDANCE_VALUES = [
    'present',
    'late',
    'absent',
] as const;

export const JOURNAL_GRADE_VALUES = [
    '',
    '2',
    '3',
    '4',
    '5',
    'pass',
] as const;

export class SaveJournalResultDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @IsIn(JOURNAL_ATTENDANCE_VALUES)
    attendance: typeof JOURNAL_ATTENDANCE_VALUES[number];

    @IsString()
    @IsIn(JOURNAL_GRADE_VALUES)
    grade = '';

    @IsString()
    @MaxLength(5000)
    lesson_result = '';

    @IsString()
    @MaxLength(5000)
    teacher_comment = '';

    @IsString()
    @MaxLength(5000)
    teacher_note = '';
}
