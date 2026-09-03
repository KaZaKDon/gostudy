import { IsIn } from 'class-validator';

export class UpdateAdminAccountRoleDto {
    @IsIn(['student', 'teacher', 'parent', 'moderator', 'admin'])
    role: string;
}
