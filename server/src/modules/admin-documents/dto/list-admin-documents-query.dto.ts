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

export class ListAdminDocumentsQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(160)
    q?: string;

    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected'])
    status?: 'pending' | 'approved' | 'rejected';

    @IsOptional()
    @IsIn(['diploma', 'certificate', 'qualification', 'other'])
    type?: 'diploma' | 'certificate' | 'qualification' | 'other';

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
