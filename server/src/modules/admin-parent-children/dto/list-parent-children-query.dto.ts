import { Transform } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class ListParentChildrenQueryDto {
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 20;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    q?: string;

    @IsOptional()
    @IsIn(['pending', 'verified', 'rejected'])
    status?: 'pending' | 'verified' | 'rejected';
}
