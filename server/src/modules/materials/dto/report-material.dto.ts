import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ReportMaterialDto {
    @IsIn(['copyright', 'inappropriate', 'harmful', 'broken_link', 'other'])
    reason: 'copyright' | 'inappropriate' | 'harmful' | 'broken_link' | 'other';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;
}
