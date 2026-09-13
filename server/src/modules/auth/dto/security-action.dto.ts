import {
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export const SECURITY_ACTIONS = [
    'change_password',
    'logout_other_sessions',
] as const;

export type SecurityAction = typeof SECURITY_ACTIONS[number];

export class SecurityActionDto {
    @IsIn(SECURITY_ACTIONS, { message: 'Некорректное действие' })
    action: SecurityAction;

    @IsOptional()
    @IsString()
    @MaxLength(256)
    current_password?: string;

    @IsOptional()
    @IsString()
    @MaxLength(256)
    new_password?: string;

    @IsOptional()
    @IsString()
    @MaxLength(256)
    new_password_confirmation?: string;
}
