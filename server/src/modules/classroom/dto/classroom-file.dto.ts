import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ClassroomFileDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    file_id: number;
}
