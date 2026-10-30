import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestMetadata } from '../../common/http/request-metadata';
import { UserRole } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import type { SessionUser } from '../auth/session-user';
import type { PlatformIdentityDto } from './platform-identity.dto';

@Injectable()
export class PlatformIdentityService {
    constructor(private readonly prisma: PrismaService) {}

    async read(): Promise<{ success: boolean; data: Record<string, string | number> }> {
        const row = await this.prisma.platformIdentity.findUnique({ where: { id: 1 } });
        if (!row) throw new ServiceUnavailableException('Реквизиты временно недоступны');
        return { success: true, data: { ...row.content as Record<string, string>, revision: row.revision } };
    }

    async save(actor: SessionUser, input: PlatformIdentityDto, metadata: RequestMetadata): Promise<{ success: boolean; data: Record<string, string | number> }> {
        if (actor.role !== UserRole.ADMIN) throw new ForbiddenException('Изменять реквизиты может только администратор');
        return this.prisma.$transaction(async (tx) => {
            const before = await tx.platformIdentity.findUnique({ where: { id: 1 } });
            if (!before) throw new ServiceUnavailableException('Реквизиты временно недоступны');
            const { revision, ...values } = input;
            // Explicit allowlist also protects direct service callers and immutable URL/sender.
            const keys = ['legalName', 'shortLegalName', 'inn', 'ogrnip', 'registrationDate', 'registeringAuthority', 'city', 'supportEmail', 'supportPhone'] as const;
            const content: Record<string, string> = { ...before.content as Record<string, string> };
            for (const key of keys) content[key] = values[key];
            const updated = await tx.platformIdentity.updateMany({
                where: { id: 1, revision }, data: { content, revision: { increment: 1 } },
            });
            if (updated.count !== 1) throw new ConflictException('Реквизиты изменены в другом окне. Обновите страницу.');
            await tx.adminAuditLog.create({ data: {
                adminId: actor.id, action: 'platform_identity.update', entityType: 'platform_identity', entityId: 1,
                oldValue: before.content as Prisma.InputJsonValue, newValue: content,
                ipAddress: metadata.ipAddress, userAgent: metadata.userAgent,
            } });
            return { success: true, data: { ...content, revision: revision + 1 } };
        });
    }
}
