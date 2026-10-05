import {
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateLessonDisputeMessageDto {
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    message_text?: string;
}
