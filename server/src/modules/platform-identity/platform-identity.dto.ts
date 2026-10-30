import { IsEmail, IsInt, IsString, Length, Matches, Min, ValidateBy } from 'class-validator';
import { Transform } from 'class-transformer';

function validRegistrationDate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return false;
    const [day, month, year] = value.split('.').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1900 && date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export class PlatformIdentityDto {
    @IsInt() @Min(1) revision!: number;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Length(2, 500) legalName!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Length(2, 500) shortLegalName!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Matches(/^\d{12}$/) inn!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Matches(/^\d{15}$/) ogrnip!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @ValidateBy({ name: 'registrationDate', validator: { validate: validRegistrationDate, defaultMessage: () => 'Укажите существующую дату регистрации в формате ДД.ММ.ГГГГ' } }) registrationDate!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Length(2, 500) registeringAuthority!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Length(2, 500) city!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsEmail() @Length(3, 320) supportEmail!: string;
    @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @Length(12, 32) @Matches(/^\+7(?:[ ()-]*\d){10}[ ()-]*$/) supportPhone!: string;
}
