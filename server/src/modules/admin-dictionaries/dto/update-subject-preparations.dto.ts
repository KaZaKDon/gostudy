import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsInt,
    Min,
    ValidateNested,
} from 'class-validator';

export class SubjectPreparationItemDto {
    @IsInt()
    @Min(1)
    id: number;

    @IsInt()
    @Min(0)
    sort_order: number;
}

export class UpdateSubjectPreparationsDto {
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => SubjectPreparationItemDto)
    preparations: SubjectPreparationItemDto[];
}
