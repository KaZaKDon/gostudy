import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class ListAccessibilityOffersQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 20;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    q?: string;

    @IsOptional()
    @IsIn(['', 'pending', 'approved', 'rejected', 'archived'])
    status: '' | 'pending' | 'approved' | 'rejected' | 'archived' = 'pending';

    @IsOptional()
    @IsIn(['', 'free', 'discount', 'individual'])
    offer_type: '' | 'free' | 'discount' | 'individual' = '';
}
