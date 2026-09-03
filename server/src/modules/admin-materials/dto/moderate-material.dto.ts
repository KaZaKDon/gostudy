import {
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ModerateMaterialDto {
    @IsIn(['approved', 'rejected'])
    decision: 'approved' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;
}

export class ResolveMaterialReportDto {
    @IsIn(['resolved', 'dismissed'])
    decision: 'resolved' | 'dismissed';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;

    @IsOptional()
    @IsBoolean()
    hide_material?: boolean;
}
