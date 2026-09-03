import { IsBoolean } from 'class-validator';

export class UpdateAdminTeacherVisibilityDto {
    @IsBoolean()
    is_visible!: boolean;
}
