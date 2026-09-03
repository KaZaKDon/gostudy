import { describe, expect, it } from 'vitest';

import { parseJournalCursor } from './journal-pagination';

describe('parseJournalCursor', () => {
    it('returns no cursor when both values are absent', () => {
        expect(parseJournalCursor(undefined, undefined, 'Europe/Moscow'))
            .toBeNull();
    });

    it('converts the viewer local date to UTC', () => {
        const cursor = parseJournalCursor(
            '2026-09-03 15:30:10',
            12,
            'Europe/Moscow',
        );

        expect(cursor).toEqual({
            date: new Date('2026-09-03T12:30:10.000Z'),
            id: 12,
        });
    });

    it('rejects an incomplete cursor', () => {
        expect(() => parseJournalCursor(
            '2026-09-03 15:30:10',
            undefined,
            'Europe/Moscow',
        )).toThrow('Некорректный указатель страницы');
    });
});
