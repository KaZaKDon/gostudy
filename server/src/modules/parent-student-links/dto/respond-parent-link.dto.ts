import { IsBoolean } from 'class-validator';

export class RespondParentLinkDto {
    @IsBoolean()
    accept!: boolean;
}
