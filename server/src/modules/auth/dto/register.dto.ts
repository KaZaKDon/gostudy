import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    Matches,
    MinLength,
    ValidateIf,
    ValidateNested,
} from 'class-validator';

class ConsentDecisionDto {
    @IsBoolean({ message: 'Результат согласия должен быть логическим значением' })
    accepted: boolean;

    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsArray()
    documents?: unknown[];
}

class RegistrationLegalAcceptancesDto {
    @ValidateNested()
    @Type(() => ConsentDecisionDto)
    platform_documents: ConsentDecisionDto;

    @ValidateNested()
    @Type(() => ConsentDecisionDto)
    personal_data: ConsentDecisionDto;

    @ValidateNested()
    @Type(() => ConsentDecisionDto)
    marketing: ConsentDecisionDto;
}

export class RegisterDto {
    @IsIn(['student', 'teacher', 'parent'], {
        message: 'Некорректная роль пользователя',
    })
    role: 'student' | 'teacher' | 'parent';

    @ValidateIf((input: RegisterDto) => input.role === 'student')
    @IsString({ message: 'Укажите дату рождения ученика' })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Дата рождения должна быть указана в формате ГГГГ-ММ-ДД',
    })
    birth_date?: string;

    @ValidateIf((input: RegisterDto) => input.role === 'parent')
    @Transform(({ value }: { value: unknown }) => (
        typeof value === 'string' ? value.trim() : value
    ))
    @IsString({ message: 'Укажите имя родителя' })
    @MinLength(3, { message: 'Укажите полное имя родителя' })
    @MaxLength(255, { message: 'Имя не должно превышать 255 символов' })
    full_name?: string;

    @ValidateIf((input: RegisterDto) => input.role === 'parent')
    @Transform(({ value }: { value: unknown }) => (
        typeof value === 'string' ? value.trim() : value
    ))
    @IsString({ message: 'Укажите телефон родителя' })
    @MaxLength(40, { message: 'Телефон не должен превышать 40 символов' })
    @Matches(/^[0-9+\s().-]{7,40}$/, {
        message: 'Укажите корректный телефон',
    })
    phone?: string;

    @IsEmail({}, { message: 'Некорректный email' })
    @MaxLength(320)
    email: string;

    @IsString()
    @MinLength(6, {
        message: 'Пароль должен содержать не менее 6 символов',
    })
    @MaxLength(72, {
        message: 'Пароль не должен превышать 72 символа',
    })
    password: string;

    @ValidateNested()
    @Type(() => RegistrationLegalAcceptancesDto)
    legal_acceptances: RegistrationLegalAcceptancesDto;
}
