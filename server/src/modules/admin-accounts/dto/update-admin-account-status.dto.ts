import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class UpdateAdminAccountStatusDto {
    @IsIn(['active', 'blocked', 'archived'])
    status: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    blocked_reason?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    archive_reason?: string;
}
