import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ModerateAdminProfileMediaDto {
    @IsIn(['approved', 'rejected'])
    decision: 'approved' | 'rejected';

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}
