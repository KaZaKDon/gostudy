import { Transform } from 'class-transformer';
import {
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export class UpdateAccountDto {
    @Transform(({ value }) => (
        typeof value === 'string' ? value.trim() : value
    ))
    @IsString({ message: 'Укажите корректный номер телефона' })
    @MaxLength(40, {
        message: 'Телефон не должен превышать 40 символов',
    })
    @Matches(/^(?:|[0-9+\s().-]{7,40})$/u, {
        message: 'Укажите корректный номер телефона',
    })
    phone: string;
}
