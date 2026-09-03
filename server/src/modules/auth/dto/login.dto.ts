import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Некорректный email' })
    @MaxLength(320)
    email: string;

    @IsString()
    @MaxLength(72)
    password: string;
}
