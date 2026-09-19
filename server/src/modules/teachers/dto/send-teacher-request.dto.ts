import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class SendTeacherRequestDto {
    @Type(() => Number)
    @IsInt({ message: 'Не указан преподаватель' })
    @Min(1, { message: 'Не указан преподаватель' })
    teacher_id: number;

    @Type(() => Number)
    @IsInt({ message: 'Выберите предмет' })
    @Min(1, { message: 'Выберите предмет' })
    subject_id: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Выберите ребёнка' })
    @Min(1, { message: 'Выберите ребёнка' })
    student_id?: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000, {
        message: 'Сообщение не должно превышать 1000 символов',
    })
    message?: string;
}
