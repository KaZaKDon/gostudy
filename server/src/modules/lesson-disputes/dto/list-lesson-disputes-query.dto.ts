import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class ListLessonDisputesQueryDto {
    @IsOptional()
    @IsIn(['', 'open', 'under_review', 'resolved', 'rejected'])
    status: '' | 'open' | 'under_review' | 'resolved' | 'rejected' = '';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id?: number;
}
