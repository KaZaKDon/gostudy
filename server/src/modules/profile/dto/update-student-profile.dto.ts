import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';

export class UpdateStudentProfileDto {
    @IsString()
    @IsNotEmpty({ message: 'Укажите имя ученика' })
    @MaxLength(120)
    first_name: string;

    @IsString()
    @IsNotEmpty({ message: 'Укажите фамилию ученика' })
    @MaxLength(120)
    last_name: string;

    @IsString()
    @MaxLength(120)
    city: string;

    @IsString()
    @MaxLength(80)
    timezone: string;

    @IsOptional()
    @IsInt({ message: 'Некорректный год рождения' })
    @Min(1920, { message: 'Некорректный год рождения' })
    @Max(new Date().getFullYear(), { message: 'Некорректный год рождения' })
    birth_year?: number | null;

    @IsString()
    @MaxLength(120)
    class_level: string;

    @IsString()
    @MaxLength(5000)
    subjects: string;

    @IsString()
    @MaxLength(5000)
    goal: string;

    @IsString()
    @MaxLength(5000)
    learning_goals: string;

    @IsString()
    @MaxLength(5000)
    level_description: string;

    @IsString()
    @MaxLength(120)
    lesson_format: string;

    @IsString()
    @MaxLength(255)
    parent_name: string;

    @IsString()
    @MaxLength(40)
    parent_phone: string;

    @IsString()
    @MaxLength(40)
    phone: string;

    @ValidateIf((_object, value) => value !== '')
    @IsEmail({}, { message: 'Некорректный email родителя' })
    @MaxLength(320)
    parent_email: string;

    @IsString()
    @MaxLength(120)
    messenger: string;

    @IsString()
    @MaxLength(120)
    contact_preference: string;

    @IsString()
    @MaxLength(255)
    preferred_time: string;

    @IsString()
    @MaxLength(5000)
    schedule_comment: string;

    @IsString()
    @MaxLength(10000)
    about: string;
}
