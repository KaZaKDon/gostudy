import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveMessageReportDto {
    @IsIn(['resolved', 'dismissed'])
    decision: 'resolved' | 'dismissed';

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    comment?: string;

    @IsOptional()
    @IsBoolean()
    hide_message?: boolean;
}
