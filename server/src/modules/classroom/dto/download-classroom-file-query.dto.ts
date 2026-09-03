import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DownloadClassroomFileQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    file_id: number;
}
