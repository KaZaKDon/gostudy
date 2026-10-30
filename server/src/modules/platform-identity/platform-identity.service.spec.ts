import { describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { PlatformIdentityDto } from './platform-identity.dto';
import { PlatformIdentityService } from './platform-identity.service';
import { AdminPlatformIdentityController } from './platform-identity.controller';

const values = { legalName: 'Индивидуальный предприниматель Внуков Дмитрий Николаевич', shortLegalName: 'ИП Внуков Дмитрий Николаевич', inn: '615001269006', ogrnip: '326619600226065', registrationDate: '28.09.2026', registeringAuthority: 'Регистрация ИП', city: 'г. Новочеркасск', supportEmail: 'support@gostudyonline.ru', supportPhone: '+7 951 522-06-69' };
const actor = { id: 4, role: UserRole.ADMIN } as SessionUser;
const metadata = { ipAddress: null, userAgent: null };
function setup(count = 1) {
    const row = { id: 1, content: { ...values, website: 'https://gostudyonline.ru', automaticEmail: 'noreply@gostudyonline.ru' }, revision: 1 };
    const tx = { platformIdentity: { findUnique: vi.fn().mockResolvedValue(row), updateMany: vi.fn().mockResolvedValue({ count }) }, adminAuditLog: { create: vi.fn() } };
    const prisma = { ...tx, $transaction: vi.fn(async (callback) => callback(tx)) };
    return { tx, prisma, service: new PlatformIdentityService(prisma as unknown as PrismaService) };
}
describe('Platform identity persistence and authorization', () => {
    it('uses the DB value on each public read without seeding or exposing audit information', async () => {
        const { service, tx } = setup();
        const first = await service.read();
        expect(first.data.city).toBe('г. Новочеркасск');
        tx.platformIdentity.findUnique.mockResolvedValueOnce({ id: 1, content: { ...values, city: 'Другой город' }, revision: 2 });
        expect((await service.read()).data.city).toBe('Другой город');
        expect(tx.platformIdentity.updateMany).not.toHaveBeenCalled();
        expect(first.data).not.toHaveProperty('adminId');
    });
    it('fails closed when the migration/seed is missing', async () => {
        const { service, tx } = setup(); tx.platformIdentity.findUnique.mockResolvedValueOnce(null);
        await expect(service.read()).rejects.toThrow('временно недоступны');
    });
    it.each([UserRole.MODERATOR, UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT])('forbids writes by %s before starting a transaction', async (role) => {
        const { service, prisma } = setup();
        await expect(service.save({ ...actor, role }, { ...values, revision: 1 }, metadata)).rejects.toThrow('администратор');
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    it('updates data and audit in a single transaction and preserves immutable deployment fields', async () => {
        const { service, tx } = setup();
        const input = { ...values, city: 'Ростов-на-Дону', revision: 1, website: 'https://attacker.example', automaticEmail: 'attacker@example.com' };
        const result = await service.save(actor, input, metadata);
        expect(result.data.city).toBe('Ростов-на-Дону');
        expect(result.data.revision).toBe(2);
        expect(result.data.website).toBe('https://gostudyonline.ru');
        expect(result.data.automaticEmail).toBe('noreply@gostudyonline.ru');
        expect(tx.platformIdentity.updateMany.mock.calls[0][0].where).toEqual({ id: 1, revision: 1 });
        expect(tx.adminAuditLog.create.mock.calls[0][0].data.oldValue.city).toBe('г. Новочеркасск');
        expect(tx.adminAuditLog.create.mock.calls[0][0].data.newValue.city).toBe('Ростов-на-Дону');
    });
    it('rejects a stale revision without writing an audit event', async () => {
        const { service, tx } = setup(0);
        await expect(service.save(actor, { ...values, revision: 1 }, metadata)).rejects.toThrow('другом окне');
        expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
    });
    it('protects the admin controller with session and role guards', () => {
        expect(Reflect.getMetadata(GUARDS_METADATA, AdminPlatformIdentityController)).toEqual([SessionAuthGuard, AdminAccessGuard]);
    });
});
describe('Identity input validation', () => {
    it('accepts real contact details and trims whitespace', async () => {
        const input = plainToInstance(PlatformIdentityDto, { ...values, city: ' г. Новочеркасск ', revision: 1 });
        expect(await validate(input)).toEqual([]); expect(input.city).toBe('г. Новочеркасск');
    });
    it.each([{ supportEmail: 'javascript:alert(1)' }, { inn: '123' }, { ogrnip: 'wrong' }, { city: '' }, { supportPhone: '+7           ' }, { revision: 0 }, { revision: '1' }, { registrationDate: '31.02.2026' }])('rejects malformed fields %j', async (bad) => {
        const input = plainToInstance(PlatformIdentityDto, { ...values, revision: 1, ...bad });
        expect((await validate(input)).length).toBeGreaterThan(0);
    });
    it('rejects unrecognized settings rather than accepting deployment secrets', async () => {
        const input = plainToInstance(PlatformIdentityDto, { ...values, revision: 1, smtpPassword: 'secret' });
        const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });
        expect(errors.some((error) => error.property === 'smtpPassword')).toBe(true);
    });
});
