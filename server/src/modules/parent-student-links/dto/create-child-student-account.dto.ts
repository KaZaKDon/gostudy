import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateChildStudentAccountDto {
    @Transform(({ value }) => typeof value === 'string'
        ? value.trim().toLowerCase()
        : value)
    @IsEmail({}, { message: 'Укажите корректный email ученика' })
    @MaxLength(320)
    email!: string;

    @IsString()
    @MinLength(6, {
        message: 'Пароль должен содержать не менее 6 символов',
    })
    @MaxLength(72, {
        message: 'Пароль не должен превышать 72 символа',
    })
    password!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(72)
    password_confirmation!: string;
}
