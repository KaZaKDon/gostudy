import { Transform, Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
    return value === '' || value === null ? undefined : value;
}

export class UploadTeacherDocumentDto {
    @IsIn(['diploma', 'certificate', 'qualification', 'other'])
    type: 'diploma' | 'certificate' | 'qualification' | 'other';

    @IsOptional()
    @IsString()
    @MaxLength(255)
    document_title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    institution?: string;

    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1950)
    @Max(2100)
    document_year?: number;

    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    education_id?: number;
}
