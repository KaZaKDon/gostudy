import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsObject,
    Min,
} from 'class-validator';

export class ClassroomMediaSignalDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id!: number;

    @IsIn(['ready', 'offer', 'answer', 'ice', 'leave', 'screen_state'])
    signal_type!:
        | 'ready'
        | 'offer'
        | 'answer'
        | 'ice'
        | 'leave'
        | 'screen_state';

    @IsObject()
    payload!: Record<string, unknown>;
}
