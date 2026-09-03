import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class MaterialIdQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id: number;
}

export class MaterialItemIdQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    item_id: number;
}
