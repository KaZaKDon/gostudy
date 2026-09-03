import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class ReportMessageDto {
    @IsInt()
    @Min(1)
    message_id: number;

    @IsIn(['spam', 'abuse', 'inappropriate', 'threat', 'other'])
    reason: 'spam' | 'abuse' | 'inappropriate' | 'threat' | 'other';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;
}
