import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class UpdateStudentStatusDto {
    @Type(() => Number)
    @IsInt({ message: 'Не указан ученик' })
    @Min(1, { message: 'Не указан ученик' })
    relation_id: number;

    @IsIn(['archive', 'restore'], { message: 'Некорректное действие' })
    action: 'archive' | 'restore';
}
