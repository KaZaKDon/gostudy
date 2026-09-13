import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsEmail({}, { message: 'Некорректный email' })
    @MaxLength(320)
    email: string;
}
