import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TeacherDetailsQueryDto {
    @Type(() => Number)
    @IsInt({ message: 'Не указан преподаватель' })
    @Min(1, { message: 'Не указан преподаватель' })
    teacher_id: number;
}
