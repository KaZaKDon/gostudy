import { Injectable } from '@nestjs/common';

import { adultBirthDateCutoff } from '../date/birth-date';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    ParentChildVerificationStatus,
    ParentStudentStatus,
} from '../../generated/prisma/enums';

export type ParentChildAccessPair = {
    parentId: number;
    studentId: number;
};

@Injectable()
export class ParentChildAccessService {
    constructor(private readonly prisma: PrismaService) {}

    async listCurrentMinorStudentIds(
        parentId: number,
        now = new Date(),
    ): Promise<number[]> {
        const profiles = await this.prisma.parentChildProfile.findMany({
            where: this.currentMinorWhere(parentId, undefined, now),
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { studentId: true },
        });

        return profiles.flatMap((profile) => (
            profile.studentId === null ? [] : [profile.studentId]
        ));
    }

    async hasCurrentMinorAccess(
        parentId: number,
        studentId: number,
        now = new Date(),
    ): Promise<boolean> {
        const profile = await this.prisma.parentChildProfile.findFirst({
            where: this.currentMinorWhere(parentId, studentId, now),
            select: { id: true },
        });

        return Boolean(profile);
    }

    async listCurrentMinorAccessPairs(
        pairs: ParentChildAccessPair[],
        now = new Date(),
    ): Promise<ParentChildAccessPair[]> {
        if (!pairs.length) {
            return [];
        }

        const profiles = await this.prisma.parentChildProfile.findMany({
            where: {
                OR: pairs.map((pair) => this.currentMinorWhere(
                    pair.parentId,
                    pair.studentId,
                    now,
                )),
            },
            select: { parentId: true, studentId: true },
        });

        return profiles.flatMap((profile) => (
            profile.studentId === null
                ? []
                : [{ parentId: profile.parentId, studentId: profile.studentId }]
        ));
    }

    private currentMinorWhere(
        parentId: number,
        studentId: number | undefined,
        now: Date,
    ): Prisma.ParentChildProfileWhereInput {
        return {
            parentId,
            ...(studentId === undefined
                ? { studentId: { not: null } }
                : { studentId }),
            verificationStatus: ParentChildVerificationStatus.VERIFIED,
            verifiedAt: { not: null },
            archivedAt: null,
            birthDate: { gt: adultBirthDateCutoff(now) },
            student: {
                childLinks: {
                    some: {
                        parentId,
                        status: ParentStudentStatus.ACTIVE,
                        verifiedAt: { not: null },
                    },
                },
            },
        };
    }
}
