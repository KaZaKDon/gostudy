import { IsIn, IsOptional } from 'class-validator';

export class ListMaterialsQueryDto {
    @IsOptional()
    @IsIn(['mine', 'catalog', 'assigned'])
    view?: 'mine' | 'catalog' | 'assigned';
}
