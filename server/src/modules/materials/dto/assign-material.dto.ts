import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignMaterialDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    relation_id: number;
}
