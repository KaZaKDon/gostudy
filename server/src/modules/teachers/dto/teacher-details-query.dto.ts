import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class TeacherDetailsQueryDto {
    @Type(() => Number)
    @IsInt({ message: 'Не указан преподаватель' })
    @Min(1, { message: 'Не указан преподаватель' })
    teacher_id: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Выберите ребёнка' })
    @Min(1, { message: 'Выберите ребёнка' })
    student_id?: number;
}
