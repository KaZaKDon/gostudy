import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ClassroomLessonDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;
}
