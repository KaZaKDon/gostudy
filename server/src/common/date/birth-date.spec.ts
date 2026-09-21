import { describe, expect, it } from 'vitest';

import {
    adultBirthDateCutoff,
    isAdultBirthDate,
    isPastBirthDate,
    parseIsoDateOnly,
} from './birth-date';

describe('birth-date utilities', () => {
    const today = new Date('2026-09-20T18:00:00.000Z');

    it('parses only real ISO calendar dates', () => {
        expect(parseIsoDateOnly('2008-02-29')).toEqual(
            new Date('2008-02-29T00:00:00.000Z'),
        );
        expect(parseIsoDateOnly('2009-02-29')).toBeNull();
        expect(parseIsoDateOnly('20.09.2008')).toBeNull();
    });

    it('uses the exact eighteenth birthday as the adult boundary', () => {
        expect(adultBirthDateCutoff(today)).toEqual(
            new Date('2008-09-20T00:00:00.000Z'),
        );
        expect(isAdultBirthDate(
            new Date('2008-09-20T00:00:00.000Z'),
            today,
        )).toBe(true);
        expect(isAdultBirthDate(
            new Date('2008-09-21T00:00:00.000Z'),
            today,
        )).toBe(false);
    });

    it('rejects today and future values as birth dates', () => {
        expect(isPastBirthDate(
            new Date('2026-09-19T00:00:00.000Z'),
            today,
        )).toBe(true);
        expect(isPastBirthDate(
            new Date('2026-09-20T00:00:00.000Z'),
            today,
        )).toBe(false);
    });
});
