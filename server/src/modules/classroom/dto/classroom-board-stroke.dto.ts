import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsIn,
    IsInt,
    IsNumber,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

class ClassroomBoardPointDto {
    @IsNumber({ maxDecimalPlaces: 5 })
    @Min(0)
    @Max(1)
    x!: number;

    @IsNumber({ maxDecimalPlaces: 5 })
    @Min(0)
    @Max(1)
    y!: number;
}

export class ClassroomBoardStrokeDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id!: number;

    @IsIn(['#2d2926', '#9b2c20', '#246b54', '#24527a', '#ffffff'])
    color!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(40)
    width!: number;

    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => ClassroomBoardPointDto)
    points!: ClassroomBoardPointDto[];
}
