import {
    IsBoolean,
    IsInt,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class SaveDictionaryItemDto {
    @IsString()
    @MinLength(1)
    @MaxLength(160)
    name: string;

    @IsString()
    @MaxLength(160)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug может содержать только строчные латинские буквы, цифры и дефисы',
    })
    slug: string;

    @IsInt()
    @Min(0)
    sort_order: number;

    @IsBoolean()
    is_active: boolean;
}

export class SaveGroupedDictionaryItemDto extends SaveDictionaryItemDto {
    @IsInt()
    @Min(1)
    group_id: number;
}
