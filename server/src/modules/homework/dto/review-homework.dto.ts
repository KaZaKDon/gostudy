import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

const HOMEWORK_DECISIONS = ['returned', 'accepted'] as const;
const HOMEWORK_GRADES = [
    '',
    '5',
    '4',
    '3',
    '2',
    'Зачёт',
    'Незачёт',
] as const;

export class ReviewHomeworkDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    homework_id: number;

    @IsIn(HOMEWORK_DECISIONS)
    decision: typeof HOMEWORK_DECISIONS[number];

    @IsString()
    @IsIn(HOMEWORK_GRADES)
    grade = '';

    @IsString()
    @MaxLength(10000)
    teacher_comment = '';
}
