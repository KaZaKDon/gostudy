import { IsBoolean } from 'class-validator';

export class UpdateTeacherVisibilityDto {
    @IsBoolean({ message: 'Некорректное значение видимости' })
    is_visible: boolean;
}
