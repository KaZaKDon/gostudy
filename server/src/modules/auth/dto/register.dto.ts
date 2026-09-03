import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
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
    @IsIn(['student', 'teacher'], {
        message: 'Некорректная роль пользователя',
    })
    role: 'student' | 'teacher';

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
