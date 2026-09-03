import { describe, expect, it } from 'vitest';

import {
    addCalendarDays,
    calendarDayDifference,
    formatInTimezone,
    parseCalendarDate,
    parseLocalDateTime,
    resolveTimezone,
    zonedDateTimeToUtc,
} from './schedule-time';

describe('schedule time helpers', () => {
    it('rejects an impossible calendar date', () => {
        expect(parseCalendarDate('2026-02-30')).toBeNull();
        expect(parseLocalDateTime('2026-08-31T24:00')).toBeNull();
    });

    it('parses a local lesson time', () => {
        expect(parseLocalDateTime('2026-08-31T18:45')).toMatchObject({
            year: 2026,
            month: 8,
            day: 31,
            hour: 18,
            minute: 45,
        });
    });

    it('builds a UTC boundary from the viewer timezone', () => {
        const parts = parseCalendarDate('2026-08-31');

        expect(parts).not.toBeNull();
        expect(
            zonedDateTimeToUtc(parts!, 'Europe/Moscow').toISOString(),
        ).toBe('2026-08-30T21:00:00.000Z');
    });

    it('formats an instant in the viewer timezone', () => {
        expect(formatInTimezone(
            new Date('2026-08-30T21:30:00.000Z'),
            'Europe/Moscow',
        )).toBe('2026-08-31 00:30:00');
    });

    it('calculates inclusive request limits by calendar days', () => {
        const from = parseCalendarDate('2026-08-31')!;
        const to = addCalendarDays(from, 31);

        expect(calendarDayDifference(from, to)).toBe(31);
    });

    it('falls back from an invalid timezone', () => {
        expect(resolveTimezone('Not/A_Timezone')).toBe('Europe/Moscow');
    });
});
