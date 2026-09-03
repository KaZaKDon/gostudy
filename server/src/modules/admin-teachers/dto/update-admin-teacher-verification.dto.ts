import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class UpdateAdminTeacherVerificationDto {
    @IsIn(['pending', 'verified', 'rejected'])
    status!: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    comment = '';
}
