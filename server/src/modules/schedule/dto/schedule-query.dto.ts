import { Matches } from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ScheduleQueryDto {
    @Matches(ISO_DATE_PATTERN, {
        message: 'Укажите начало периода в формате YYYY-MM-DD',
    })
    from: string;

    @Matches(ISO_DATE_PATTERN, {
        message: 'Укажите окончание периода в формате YYYY-MM-DD',
    })
    to: string;
}
