import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class RespondStudentRequestDto {
    @Type(() => Number)
    @IsInt({ message: 'Не указана заявка' })
    @Min(1, { message: 'Не указана заявка' })
    request_id: number;

    @IsIn(['accept', 'reject'], { message: 'Некорректное действие' })
    action: 'accept' | 'reject';
}
