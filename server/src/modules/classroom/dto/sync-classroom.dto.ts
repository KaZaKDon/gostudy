import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class SyncClassroomDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    after_message_id = 0;
}
