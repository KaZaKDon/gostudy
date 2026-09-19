import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class SaveAccessibilityOfferDto {
    @IsIn(['free', 'discount', 'individual'])
    offer_type: 'free' | 'discount' | 'individual';

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10)
    slots: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(10)
    @Max(90)
    discount_percent?: number | null;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    default_duration_months?: number | null;

    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    @Min(1, { each: true })
    subject_ids: number[];

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}
