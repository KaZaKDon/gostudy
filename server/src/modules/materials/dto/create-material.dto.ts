import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateMaterialDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    subject_id: number;

    @IsIn(['textbook', 'trainer', 'extra'])
    category: 'textbook' | 'trainer' | 'extra';

    @IsString()
    @MinLength(1)
    @MaxLength(255)
    title: string;

    @IsOptional()
    @IsString()
    @MaxLength(10000)
    description?: string;

    @IsIn(['free', 'paid'])
    access_type: 'free' | 'paid';

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(1)
    @Max(1000000)
    price_rub?: number;

    @IsIn(['private', 'public'])
    publication_mode: 'private' | 'public';

    @IsOptional()
    @IsIn(['external_link', 'interactive_link'])
    link_type?: 'external_link' | 'interactive_link';

    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(2000)
    external_url?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    link_title?: string;
}
