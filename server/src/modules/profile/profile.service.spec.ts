import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ProfileService } from './profile.service';

const sessionUser: SessionUser = {
    id: 24,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function createService() {
    const prisma = {
        user: {
            update: vi.fn().mockImplementation(({ data }) => ({
                ...sessionUser,
                phone: data.phone,
            })),
        },
    } as unknown as PrismaService;

    return {
        prisma,
        service: new ProfileService(prisma),
    };
}

describe('ProfileService account contacts', () => {
    it('trims and saves the phone for the authenticated user', async () => {
        const { prisma, service } = createService();

        await expect(service.updateAccount(sessionUser, {
            phone: '  +7 (900) 000-00-00  ',
        })).resolves.toMatchObject({
            success: true,
            user: { phone: '+7 (900) 000-00-00' },
        });
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: sessionUser.id },
                data: { phone: '+7 (900) 000-00-00' },
            }),
        );
    });

    it('stores an empty phone as null', async () => {
        const { prisma, service } = createService();

        await service.updateAccount(sessionUser, { phone: '   ' });

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { phone: null } }),
        );
    });

    it('does not remove the required parent phone', async () => {
        const { prisma, service } = createService();

        await expect(service.updateAccount({
            ...sessionUser,
            role: UserRole.PARENT,
        }, { phone: '   ' })).rejects.toThrow(
            'Для аккаунта родителя необходимо указать телефон',
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects unsupported phone characters', async () => {
        const input = new UpdateAccountDto();
        input.phone = 'позвонить вечером';

        const errors = await validate(input);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints).toMatchObject({
            matches: 'Укажите корректный номер телефона',
        });
    });

    it('accepts whitespace as removing the phone', async () => {
        const input = plainToInstance(UpdateAccountDto, { phone: '   ' });

        await expect(validate(input)).resolves.toHaveLength(0);
        expect(input.phone).toBe('');
    });
});
