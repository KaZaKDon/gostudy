import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondAccessibilityApplicationDto {
    @IsIn(['accepted', 'rejected'])
    decision: 'accepted' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    comment?: string;
}
