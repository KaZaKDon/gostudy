import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class ListHomeworkQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id?: number;
}
