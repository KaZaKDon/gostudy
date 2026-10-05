import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';

type TeacherAccessDatabase = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TeacherApplicantAccessService {
    constructor(
        private readonly parentChildAccess: ParentChildAccessService,
    ) {}

    assertCanBrowse(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT && user.role !== UserRole.PARENT) {
            throw new ForbiddenException(
                'Поиск преподавателя доступен ученику или родителю',
            );
        }
    }

    async resolveRequiredStudentId(
        database: TeacherAccessDatabase,
        user: SessionUser,
        requestedStudentId?: number,
    ): Promise<number> {
        this.assertCanBrowse(user);

        if (user.role === UserRole.STUDENT) {
            return user.id;
        }

        if (!requestedStudentId) {
            throw new BadRequestException('Выберите ребёнка');
        }

        await this.assertCurrentParentAccess(
            database,
            user.id,
            requestedStudentId,
        );

        return requestedStudentId;
    }

    async resolveOptionalStudentId(
        database: TeacherAccessDatabase,
        user: SessionUser,
        requestedStudentId?: number,
    ): Promise<number | null> {
        this.assertCanBrowse(user);

        if (user.role === UserRole.STUDENT) {
            return user.id;
        }

        if (!requestedStudentId) {
            return null;
        }

        await this.assertCurrentParentAccess(
            database,
            user.id,
            requestedStudentId,
        );

        return requestedStudentId;
    }

    private async assertCurrentParentAccess(
        database: TeacherAccessDatabase,
        parentId: number,
        studentId: number,
    ): Promise<void> {
        const hasAccess = await this.parentChildAccess.hasCurrentMinorAccessIn(
            database,
            parentId,
            studentId,
        );

        if (!hasAccess) {
            throw new ForbiddenException(
                'Ребёнок не подтверждён, не привязан или уже достиг 18 лет',
            );
        }
    }
}
