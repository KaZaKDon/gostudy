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

export class ListAdminProfileMediaQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(160)
    q?: string;

    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected', 'replaced'])
    status?: 'pending' | 'approved' | 'rejected' | 'replaced';

    @IsOptional()
    @IsIn(['photo', 'video'])
    type?: 'photo' | 'video';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}
