import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class FindTeachersQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    subject_id?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    preparation_id?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    age_group_id?: number;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(100)
    min_experience?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10_000_000)
    max_price?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(5)
    min_rating?: number;

    @IsOptional()
    @IsIn(['true'])
    accessible_only?: 'true';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10_000)
    page = 1;
}
