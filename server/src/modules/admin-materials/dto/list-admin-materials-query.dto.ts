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

export class ListAdminMaterialsQueryDto {
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
    @IsIn(['', 'private', 'pending', 'approved', 'rejected', 'hidden'])
    status: '' | 'private' | 'pending' | 'approved' | 'rejected' | 'hidden' = 'pending';
}

export class ListAdminMaterialReportsQueryDto {
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
    @IsIn(['', 'pending', 'resolved', 'dismissed'])
    status: '' | 'pending' | 'resolved' | 'dismissed' = 'pending';
}
