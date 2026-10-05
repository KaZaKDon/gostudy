import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

export class ListTeacherFinanceQueryDto {
    @IsOptional()
    @IsIn(['all', 'current_month', 'previous_month', '90_days'])
    period: 'all' | 'current_month' | 'previous_month' | '90_days' = 'current_month';

    @IsOptional()
    @IsIn([
        '',
        'awaiting_payment',
        'overdue',
        'pay_later',
        'paid',
        'ready_for_payout',
        'payout_paid',
        'disputed',
        'waived',
        'refunded',
    ])
    status: ''
        | 'awaiting_payment'
        | 'overdue'
        | 'pay_later'
        | 'paid'
        | 'ready_for_payout'
        | 'payout_paid'
        | 'disputed'
        | 'waived'
        | 'refunded' = '';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 20;
}
