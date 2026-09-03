import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class HomeworkIdDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    homework_id: number;
}

export class HomeworkIdQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id: number;
}
