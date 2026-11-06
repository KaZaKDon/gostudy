import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class ListAdminSubscriptionsQueryDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000)
    page = 1;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
    limit = 20;

    @IsOptional() @IsString() @MaxLength(255)
    q?: string;

    @IsOptional() @IsIn(['live', 'test', 'all'])
    mode: 'live' | 'test' | 'all' = 'live';

    @IsOptional() @IsIn(['paid', 'pending'])
    payment_status?: 'paid' | 'pending';

    @IsOptional() @IsIn(['active', 'scheduled', 'expired', 'missing'])
    period_status?: 'active' | 'scheduled' | 'expired' | 'missing';

    @IsOptional() @IsIn(['scheduled', 'submitted', 'registered', 'review', 'held', 'missing'])
    receipt_state?: 'scheduled' | 'submitted' | 'registered' | 'review' | 'held' | 'missing';

    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
    paid_from?: string;

    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
    paid_to?: string;
}
