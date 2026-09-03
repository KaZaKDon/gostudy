import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SendClassroomMessageDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    message_text: string;
}
