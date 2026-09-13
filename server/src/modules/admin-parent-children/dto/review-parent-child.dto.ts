import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ReviewParentChildDto {
    @IsIn(['approved', 'needs_clarification', 'rejected'])
    decision!: 'approved' | 'needs_clarification' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    comment?: string;
}
