import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
    @IsIn(['review', 'reply'])
    target: 'review' | 'reply';

    @IsIn(['approved', 'rejected'])
    decision: 'approved' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;
}
