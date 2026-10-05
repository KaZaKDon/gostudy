import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ModerateLessonDisputeDto {
    @IsIn(['review', 'decide'])
    action: 'review' | 'decide';

    @IsOptional()
    @IsIn([
        'applicant_supported',
        'respondent_supported',
        'mutual_agreement',
        'no_violation',
    ])
    decision?:
        | 'applicant_supported'
        | 'respondent_supported'
        | 'mutual_agreement'
        | 'no_violation';

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    comment?: string;
}
