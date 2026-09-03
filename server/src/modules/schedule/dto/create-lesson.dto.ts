import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateLessonDto {
    @Type(() => Number)
    @IsInt({ message: 'Выберите ученика и предмет' })
    @Min(1, { message: 'Выберите ученика и предмет' })
    relation_id: number;

    @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
        message: 'Укажите корректные дату и время урока',
    })
    lesson_date: string;

    @Type(() => Number)
    @IsIn([45, 60, 90], {
        message: 'Выберите доступную продолжительность урока',
    })
    duration_minutes: number;

    @IsString()
    @Matches(/\S/, { message: 'Укажите тему урока' })
    @MaxLength(255, {
        message: 'Тема урока не должна превышать 255 символов',
    })
    lesson_topic: string;

    @IsOptional()
    @IsString()
    @MaxLength(10_000, { message: 'Комментарий к уроку слишком длинный' })
    lesson_notes?: string;
}
