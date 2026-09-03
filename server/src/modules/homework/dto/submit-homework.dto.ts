import { Type } from 'class-transformer';
import {
    IsInt,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class SubmitHomeworkDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    homework_id: number;

    @IsString()
    @MaxLength(30000)
    answer_text = '';
}
