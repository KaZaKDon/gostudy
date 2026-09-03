import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class StudentDetailsQueryDto {
    @Type(() => Number)
    @IsInt({ message: 'Не указан ученик' })
    @Min(1, { message: 'Не указан ученик' })
    relation_id: number;

    @IsIn([
        'overview',
        'lessons',
        'homework',
        'program',
        'materials',
        'payments',
        'parents',
        'feedback',
    ])
    tab: string;
}
