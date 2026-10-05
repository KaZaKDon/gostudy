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

export type CurrentMinorChild = ParentChildAccessPair & {
    firstName: string;
    lastName: string;
    middleName: string | null;
    timezone: string | null;
    studentTimezone: string | null;
};

@Injectable()
export class ParentChildAccessService {
    constructor(private readonly prisma: PrismaService) {}

    async listCurrentMinorStudentIds(
        parentId: number,
        now = new Date(),
    ): Promise<number[]> {
        const children = await this.listCurrentMinorChildren(parentId, now);

        return children.map((child) => child.studentId);
    }

    async listCurrentMinorChildren(
        parentId: number,
        now = new Date(),
    ): Promise<CurrentMinorChild[]> {
        return this.listCurrentMinorChildrenIn(this.prisma, parentId, now);
    }

    async listCurrentMinorChildrenIn(
        database: PrismaService | Prisma.TransactionClient,
        parentId: number,
        now = new Date(),
    ): Promise<CurrentMinorChild[]> {
        const profiles = await database.parentChildProfile.findMany({
            where: this.currentMinorWhere(parentId, undefined, now),
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: this.currentMinorSelect(),
        });

        return this.toCurrentMinorChildren(profiles);
    }

    async hasCurrentMinorAccess(
        parentId: number,
        studentId: number,
        now = new Date(),
    ): Promise<boolean> {
        return this.hasCurrentMinorAccessIn(
            this.prisma,
            parentId,
            studentId,
            now,
        );
    }

    async hasCurrentMinorAccessIn(
        database: PrismaService | Prisma.TransactionClient,
        parentId: number,
        studentId: number,
        now = new Date(),
    ): Promise<boolean> {
        const profile = await database.parentChildProfile.findFirst({
            where: this.currentMinorWhere(parentId, studentId, now),
            select: { id: true },
        });

        return Boolean(profile);
    }

    async listCurrentMinorAccessPairs(
        pairs: ParentChildAccessPair[],
        now = new Date(),
    ): Promise<ParentChildAccessPair[]> {
        const children = await this.listCurrentMinorChildrenForPairsIn(
            this.prisma,
            pairs,
            now,
        );

        return children.map(({ parentId, studentId }) => ({
            parentId,
            studentId,
        }));
    }

    async listCurrentMinorChildrenForPairsIn(
        database: PrismaService | Prisma.TransactionClient,
        pairs: ParentChildAccessPair[],
        now = new Date(),
    ): Promise<CurrentMinorChild[]> {
        if (!pairs.length) {
            return [];
        }

        const profiles = await database.parentChildProfile.findMany({
            where: {
                OR: pairs.map((pair) => this.currentMinorWhere(
                    pair.parentId,
                    pair.studentId,
                    now,
                )),
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: this.currentMinorSelect(),
        });

        return this.toCurrentMinorChildren(profiles);
    }

    private currentMinorSelect() {
        return {
            parentId: true,
            studentId: true,
            firstName: true,
            lastName: true,
            middleName: true,
            timezone: true,
            student: {
                select: {
                    studentProfile: {
                        select: { timezone: true },
                    },
                },
            },
        } as const;
    }

    private toCurrentMinorChildren(
        profiles: Array<{
            parentId: number;
            studentId: number | null;
            firstName: string;
            lastName: string;
            middleName: string | null;
            timezone: string | null;
            student: {
                studentProfile: { timezone: string | null } | null;
            } | null;
        }>,
    ): CurrentMinorChild[] {
        return profiles.flatMap((profile) => (
            profile.studentId === null
                ? []
                : [{
                    parentId: profile.parentId,
                    studentId: profile.studentId,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    middleName: profile.middleName,
                    timezone: profile.timezone,
                    studentTimezone:
                        profile.student?.studentProfile?.timezone ?? null,
                }]
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
