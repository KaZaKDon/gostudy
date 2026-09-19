import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class SaveReviewDto {
    @IsInt()
    @Min(1)
    relation_id: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    child_id?: number;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsString()
    @MinLength(20)
    @MaxLength(3000)
    text: string;
}
