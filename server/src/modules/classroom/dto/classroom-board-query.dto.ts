import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ClassroomBoardQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id!: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    after_id = 0;
}
