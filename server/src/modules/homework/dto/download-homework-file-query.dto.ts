import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    Min,
} from 'class-validator';

export class DownloadHomeworkFileQueryDto {
    @IsIn(['assignment', 'submission'])
    type: 'assignment' | 'submission';

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id: number;
}
