import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SaveReviewReplyDto {
    @IsInt()
    @Min(1)
    review_id: number;

    @IsString()
    @MinLength(2)
    @MaxLength(2000)
    text: string;
}
