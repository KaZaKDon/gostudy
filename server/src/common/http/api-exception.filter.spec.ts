import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpException, Logger } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('API error response regressions', () => {
    afterEach(() => vi.restoreAllMocks());
    it('returns JSON for an ordinary error instead of throwing while reading null.message', () => {
        vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
        const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        new ApiExceptionFilter().catch(new Error('internal database detail'), { switchToHttp: () => ({
            getResponse: () => response, getRequest: () => ({ method: 'POST', originalUrl: '/checkout' }),
        }) } as any);
        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Внутренняя ошибка сервера' });
    });
    it('also accepts an HttpException with a null body', () => {
        const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        new ApiExceptionFilter().catch(new HttpException(null as any, 503), { switchToHttp: () => ({
            getResponse: () => response, getRequest: () => ({}),
        }) } as any);
        expect(response.status).toHaveBeenCalledWith(503);
    });
});
