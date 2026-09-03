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

export class ListAdminReviewsQueryDto {
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
    @IsIn(['', 'pending', 'approved', 'rejected'])
    status: '' | 'pending' | 'approved' | 'rejected' = 'pending';

    @IsOptional()
    @IsIn(['', 'review', 'reply'])
    target: '' | 'review' | 'reply' = '';
}
