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

export class ListAdminTeachersQueryDto {
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
    @MaxLength(255)
    q?: string;

    @IsOptional()
    @IsIn(['active', 'blocked', 'archived', 'deleted'])
    status?: string;

    @IsOptional()
    @IsIn(['pending', 'verified', 'rejected'])
    verification_status?: string;

    @IsOptional()
    @IsIn(['0', '1'])
    is_visible?: string;
}
