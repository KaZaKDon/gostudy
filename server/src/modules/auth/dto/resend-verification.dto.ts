import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationDto {
    @IsEmail({}, { message: 'Некорректный email' })
    @MaxLength(320)
    email: string;
}
