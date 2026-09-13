import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) => (
    typeof value === 'string' ? value.trim() : value
);

class ParentChildConsentDto {
    @IsBoolean({ message: 'Подтверждение согласия должно быть логическим значением' })
    accepted: boolean;
}

export class CreateParentChildDto {
    @Transform(trimText)
    @IsString({ message: 'Укажите фамилию ребёнка' })
    @MinLength(1, { message: 'Укажите фамилию ребёнка' })
    @MaxLength(120)
    last_name: string;

    @Transform(trimText)
    @IsString({ message: 'Укажите имя ребёнка' })
    @MinLength(1, { message: 'Укажите имя ребёнка' })
    @MaxLength(120)
    first_name: string;

    @IsOptional()
    @Transform(trimText)
    @IsString()
    @MaxLength(120)
    middle_name?: string;

    @IsString({ message: 'Укажите дату рождения ребёнка' })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Дата рождения должна быть указана в формате ГГГГ-ММ-ДД',
    })
    birth_date: string;

    @IsOptional()
    @Transform(trimText)
    @IsString()
    @MaxLength(120)
    city?: string;

    @IsOptional()
    @Transform(trimText)
    @IsString()
    @MaxLength(80)
    timezone?: string;

    @IsOptional()
    @Transform(trimText)
    @IsString()
    @MaxLength(120)
    class_level?: string;

    @IsIn(['parent', 'guardian', 'trustee'], {
        message: 'Укажите основание законного представительства',
    })
    representative_type: 'parent' | 'guardian' | 'trustee';

    @ValidateNested()
    @Type(() => ParentChildConsentDto)
    legal_acceptance: ParentChildConsentDto;
}
