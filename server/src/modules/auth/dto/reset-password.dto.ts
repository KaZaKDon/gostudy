import {
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    @MaxLength(256)
    token: string;

    @IsString()
    @MinLength(8, {
        message: 'Новый пароль должен содержать не менее 8 символов',
    })
    @MaxLength(256)
    new_password: string;

    @IsString()
    @MaxLength(256)
    new_password_confirmation: string;
}
