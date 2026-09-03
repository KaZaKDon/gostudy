import { Type } from 'class-transformer';
import {
    Allow,
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

class SubjectPreparationDto {
    @IsInt()
    @Min(1)
    subject_id: number;

    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    preparation_ids: number[];
}

class TeacherEducationDto {
    @Allow()
    id?: number | string;

    @IsString()
    @MaxLength(255)
    institution: string;

    @IsString()
    @MaxLength(255)
    faculty: string;

    @IsString()
    @MaxLength(255)
    speciality: string;

    @IsString()
    @MaxLength(255)
    qualification: string;

    @Allow()
    graduation_year?: number | string;

    @IsString()
    @MaxLength(10000)
    description: string;

    @IsBoolean()
    is_primary: boolean;
}

export class UpdateTeacherProfileDto {
    @IsString()
    @IsNotEmpty({ message: 'Укажите имя преподавателя' })
    @MaxLength(120)
    first_name: string;

    @IsString()
    @IsNotEmpty({ message: 'Укажите фамилию преподавателя' })
    @MaxLength(120)
    last_name: string;

    @IsString()
    @MaxLength(2000)
    photo_url: string;

    @IsString()
    @IsNotEmpty({ message: 'Укажите город' })
    @MaxLength(120)
    city: string;

    @IsString()
    @MaxLength(80)
    timezone: string;

    @IsString()
    @IsNotEmpty({ message: 'Укажите короткий заголовок' })
    @MaxLength(180)
    headline: string;

    @IsString()
    @IsNotEmpty({ message: 'Расскажите о себе' })
    @MaxLength(10000)
    about: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'Выберите хотя бы один предмет' })
    @IsInt({ each: true })
    @Min(1, { each: true })
    subject_ids: number[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SubjectPreparationDto)
    subject_preparations: SubjectPreparationDto[];

    @IsArray()
    @ArrayMinSize(1, { message: 'Выберите хотя бы одну возрастную группу' })
    @IsInt({ each: true })
    @Min(1, { each: true })
    age_group_ids: number[];

    @IsInt({ message: 'Укажите опыт преподавания' })
    @Min(0)
    @Max(80)
    experience_years: number;

    @IsString()
    @IsNotEmpty({ message: 'Опишите, как проходят занятия' })
    @MaxLength(10000)
    teaching_method: string;

    @IsString()
    @MaxLength(10000)
    first_lesson_description: string;

    @IsString()
    @MaxLength(10000)
    student_gets: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'Добавьте образование' })
    @ArrayMaxSize(10, { message: 'Можно указать не более десяти записей об образовании' })
    @ValidateNested({ each: true })
    @Type(() => TeacherEducationDto)
    education: TeacherEducationDto[];

    @Allow()
    price_45?: number | string;

    @Allow()
    price_60?: number | string;

    @Allow()
    price_90?: number | string;

    @IsBoolean()
    trial_lesson_enabled: boolean;

    @IsString()
    @MaxLength(10000)
    pricing_comment: string;

    @IsString()
    @IsNotEmpty({ message: 'Укажите расписание' })
    @MaxLength(10000)
    schedule_description: string;

    @IsBoolean()
    accessibility_enabled: boolean;

    @IsBoolean()
    accessibility_free_lessons: boolean;

    @IsBoolean()
    accessibility_discount: boolean;

    @IsBoolean()
    accessibility_individual: boolean;

    @Allow()
    accessibility_slots?: number | string;

    @IsString()
    @MaxLength(10000)
    accessibility_comment: string;

    @IsString()
    @MaxLength(2000)
    intro_video_url: string;

    @IsBoolean()
    uses_author_materials: boolean;

    @IsBoolean()
    sells_author_materials: boolean;

    @IsString()
    @MaxLength(10000)
    author_materials_description: string;
}
