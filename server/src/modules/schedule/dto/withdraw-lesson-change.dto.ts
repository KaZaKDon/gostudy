import { IsInt, Min } from 'class-validator';

export class WithdrawLessonChangeDto {
    @IsInt()
    @Min(1)
    request_id: number;
}
