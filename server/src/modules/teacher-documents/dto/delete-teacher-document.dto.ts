import { Type } from 'class-transformer';
import {
    IsInt,
    Min,
} from 'class-validator';

export class DeleteTeacherDocumentDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    document_id: number;
}
