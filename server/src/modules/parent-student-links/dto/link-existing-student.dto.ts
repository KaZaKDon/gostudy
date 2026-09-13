import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class LinkExistingStudentDto {
    @Transform(({ value }) => typeof value === 'string'
        ? value.trim().toLowerCase()
        : value)
    @IsEmail({}, { message: 'Укажите корректный email ученика' })
    @MaxLength(320)
    email!: string;
}
