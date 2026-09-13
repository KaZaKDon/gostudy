import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ClassroomBoardTextDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    lesson_id!: number;

    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    content!: string;

    @IsIn(['#2d2926', '#9b2c20', '#246b54', '#24527a'])
    color!: string;

    @IsNumber({ maxDecimalPlaces: 5 })
    @Min(0)
    @Max(1)
    x!: number;

    @IsNumber({ maxDecimalPlaces: 5 })
    @Min(0)
    @Max(1)
    y!: number;
}

export class ClassroomBoardTextUpdateDto extends ClassroomBoardTextDto {}
