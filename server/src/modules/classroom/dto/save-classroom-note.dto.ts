import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class SaveClassroomNoteDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @IsString()
    @MaxLength(5000)
    note_text: string;
}
