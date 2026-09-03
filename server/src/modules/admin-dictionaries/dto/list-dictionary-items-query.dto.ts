import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class ListDictionaryItemsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    group_id?: number;

    @IsOptional()
    @IsIn(['0', '1'])
    is_active?: '0' | '1';

    @IsOptional()
    @IsString()
    @MaxLength(160)
    search?: string;
}
