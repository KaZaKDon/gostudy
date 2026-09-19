import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateAccessibilityApplicationDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    offer_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    subject_id: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id?: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    message?: string;
}
