import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ModerateAccessibilityOfferDto {
    @IsIn(['approved', 'rejected'])
    decision: 'approved' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;
}
