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

export class ListAdminAccountsQueryDto {
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
    @IsIn(['student', 'teacher', 'parent', 'moderator', 'admin'])
    role?: string;

    @IsOptional()
    @IsIn(['active', 'blocked', 'archived', 'deleted'])
    status?: string;
}
