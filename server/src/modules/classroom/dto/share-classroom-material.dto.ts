import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ShareClassroomMaterialDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    file_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100000)
    page = 1;
}
