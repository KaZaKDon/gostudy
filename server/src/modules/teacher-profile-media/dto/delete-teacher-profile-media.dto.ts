import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class DeleteTeacherProfileMediaDto {
    @IsIn(['photo', 'video'])
    type: 'photo' | 'video';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    media_id?: number;
}
