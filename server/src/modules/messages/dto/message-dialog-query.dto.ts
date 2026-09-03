import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class MessageDialogQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    teacher_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    student_id: number;

    @IsIn(['student', 'parent'])
    channel_type: 'student' | 'parent';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    parent_id?: number;
}

export class MessageThreadQueryDto extends MessageDialogQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    before_id?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 50;
}

export class MessageAttachmentQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    attachment_id: number;
}
