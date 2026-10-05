import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherApplicantAccessService } from './teacher-applicant-access.service';

const student: SessionUser = {
    id: 21,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

const parent: SessionUser = {
    ...student,
    id: 22,
    role: UserRole.PARENT,
    email: 'parent@example.com',
};

const teacher: SessionUser = {
    ...student,
    id: 23,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
};

describe('TeacherApplicantAccessService', () => {
    it('uses the current student account without parent lookup', async () => {
        const hasCurrentMinorAccessIn = vi.fn();
        const service = new TeacherApplicantAccessService({
            hasCurrentMinorAccessIn,
        } as unknown as ParentChildAccessService);

        await expect(service.resolveRequiredStudentId(
            {} as PrismaService,
            student,
        )).resolves.toBe(student.id);
        expect(hasCurrentMinorAccessIn).not.toHaveBeenCalled();
    });

    it('allows a parent to browse without selecting a child', async () => {
        const service = new TeacherApplicantAccessService({
            hasCurrentMinorAccessIn: vi.fn(),
        } as unknown as ParentChildAccessService);

        await expect(service.resolveOptionalStudentId(
            {} as PrismaService,
            parent,
        )).resolves.toBeNull();
    });

    it('checks the current minor link for a selected child', async () => {
        const hasCurrentMinorAccessIn = vi.fn().mockResolvedValue(true);
        const database = {} as PrismaService;
        const service = new TeacherApplicantAccessService({
            hasCurrentMinorAccessIn,
        } as unknown as ParentChildAccessService);

        await expect(service.resolveRequiredStudentId(
            database,
            parent,
            31,
        )).resolves.toBe(31);
        expect(hasCurrentMinorAccessIn).toHaveBeenCalledWith(
            database,
            parent.id,
            31,
        );
    });

    it('rejects a teacher from the student directory', () => {
        const service = new TeacherApplicantAccessService({
            hasCurrentMinorAccessIn: vi.fn(),
        } as unknown as ParentChildAccessService);

        expect(() => service.assertCanBrowse(teacher))
            .toThrow(ForbiddenException);
    });
});
