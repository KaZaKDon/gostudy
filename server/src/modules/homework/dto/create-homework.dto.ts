import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateHomeworkDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    relation_id: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id?: number;

    @IsString()
    @MinLength(1)
    @MaxLength(255)
    title: string;

    @IsString()
    @MinLength(1)
    @MaxLength(20000)
    description: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    due_date?: string;
}
