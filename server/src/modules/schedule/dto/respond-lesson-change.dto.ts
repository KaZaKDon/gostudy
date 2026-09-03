import { Transform } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class RespondLessonChangeDto {
    @IsInt()
    @Min(1)
    request_id: number;

    @Transform(({ value }) => typeof value === 'string'
        ? value.trim().toLowerCase()
        : value)
    @IsIn(['approve', 'reject'])
    decision: 'approve' | 'reject';

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @MaxLength(2000)
    comment: string;
}
