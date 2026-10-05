import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

export class ListAdminLessonDisputesQueryDto {
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
    @IsIn(['', 'open', 'under_review', 'resolved', 'rejected'])
    status: '' | 'open' | 'under_review' | 'resolved' | 'rejected' = 'open';
}
