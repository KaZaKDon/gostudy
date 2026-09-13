import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherVerificationStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { toPublicUser } from '../auth/session-user';
import type { UpdateAccountDto } from './dto/update-account.dto';
import type { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import type { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import type { UpdateTeacherVisibilityDto } from './dto/update-teacher-visibility.dto';

@Injectable()
export class ProfileService {
    constructor(private readonly prisma: PrismaService) {}

    async getMe(user: SessionUser): Promise<Record<string, unknown>> {
        if (user.role === UserRole.TEACHER) {
            return this.getTeacherMe(user);
        }

        if (user.role === UserRole.STUDENT) {
            const profile = await this.prisma.studentProfile.findUnique({
                where: { userId: user.id },
            });

            return {
                success: true,
                user: toPublicUser(user),
                profile: profile ? this.studentProfileToApi(profile, user.phone) : null,
                subjects: [],
                subject_ids: [],
                subject_preparations: [],
                age_groups: [],
                age_group_ids: [],
                education: [],
                documents: [],
            };
        }

        return {
            success: true,
            user: toPublicUser(user),
            profile: null,
        };
    }

    async updateAccount(
        user: SessionUser,
        input: UpdateAccountDto,
    ): Promise<Record<string, unknown>> {
        const phone = input.phone.trim() || null;

        if (user.role === UserRole.PARENT && !phone) {
            throw new BadRequestException(
                'Для аккаунта родителя необходимо указать телефон',
            );
        }

        const savedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: { phone },
            select: {
                id: true,
                role: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                status: true,
                emailVerifiedAt: true,
                profileCompleted: true,
            },
        });

        return {
            success: true,
            message: 'Контактные данные сохранены',
            user: toPublicUser(savedUser),
        };
    }

    async getTeacherOptions(
        user: SessionUser,
    ): Promise<Record<string, unknown>> {
        this.requireRole(user, UserRole.TEACHER, 'преподавателю');

        const [groups, ageGroups] = await Promise.all([
            this.prisma.subjectGroup.findMany({
                where: { isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                include: {
                    subjects: {
                        where: { isActive: true },
                        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                        include: {
                            preparations: {
                                orderBy: { sortOrder: 'asc' },
                                include: {
                                    preparation: {
                                        include: { group: true },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.studentAgeGroup.findMany({
                where: { isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            }),
        ]);

        return {
            success: true,
            subject_groups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                slug: group.slug,
                subjects: group.subjects.map((subject) => {
                    const preparationGroups = new Map<number, {
                        id: number;
                        name: string;
                        slug: string;
                        sort_order: number;
                        preparations: Array<{
                            id: number;
                            name: string;
                            slug: string;
                        }>;
                    }>();

                    for (const link of subject.preparations) {
                        const preparation = link.preparation;

                        if (!preparation.isActive || !preparation.group.isActive) {
                            continue;
                        }

                        const groupItem = preparationGroups.get(
                            preparation.group.id,
                        ) ?? {
                            id: preparation.group.id,
                            name: preparation.group.name,
                            slug: preparation.group.slug,
                            sort_order: preparation.group.sortOrder,
                            preparations: [],
                        };

                        groupItem.preparations.push({
                            id: preparation.id,
                            name: preparation.name,
                            slug: preparation.slug,
                        });
                        preparationGroups.set(preparation.group.id, groupItem);
                    }

                    return {
                        id: subject.id,
                        name: subject.name,
                        slug: subject.slug,
                        preparation_groups: [...preparationGroups.values()]
                            .sort((left, right) => left.sort_order - right.sort_order)
                            .map(({ sort_order: ignored, ...item }) => item),
                    };
                }),
            })),
            age_groups: ageGroups.map((group) => ({
                id: group.id,
                name: group.name,
                slug: group.slug,
            })),
            upload_limits: {
                photo_max_bytes: 5 * 1024 * 1024,
                document_max_bytes: 10 * 1024 * 1024,
                video_max_bytes: 100 * 1024 * 1024,
            },
        };
    }

    async getStudentProfile(
        user: SessionUser,
    ): Promise<Record<string, unknown>> {
        this.requireRole(user, UserRole.STUDENT, 'ученику');
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: user.id },
        });

        return {
            success: true,
            profile: profile ? this.studentProfileToApi(profile, user.phone) : null,
        };
    }

    async updateTeacherVisibility(
        user: SessionUser,
        input: UpdateTeacherVisibilityDto,
    ): Promise<Record<string, unknown>> {
        this.requireRole(user, UserRole.TEACHER, 'преподавателю');
        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId: user.id },
            select: {
                verificationStatus: true,
                isVisible: true,
            },
        });

        if (!profile) {
            throw new NotFoundException(
                'Сначала заполните анкету преподавателя',
            );
        }

        if (
            input.is_visible
            && profile.verificationStatus !== TeacherVerificationStatus.VERIFIED
        ) {
            throw new ConflictException(
                'Показ анкеты можно включить после подтверждения модератором',
            );
        }

        const saved = await this.prisma.teacherProfile.update({
            where: { userId: user.id },
            data: { isVisible: input.is_visible },
            select: {
                verificationStatus: true,
                isVisible: true,
            },
        });

        return {
            success: true,
            message: saved.isVisible
                ? 'Анкета показывается в поиске'
                : 'Анкета скрыта из поиска',
            profile: {
                is_visible: saved.isVisible,
                verification_status: this.teacherVerificationToApi(
                    saved.verificationStatus,
                ),
            },
        };
    }

    async updateStudentProfile(
        user: SessionUser,
        input: UpdateStudentProfileDto,
    ): Promise<Record<string, unknown>> {
        this.requireRole(user, UserRole.STUDENT, 'ученику');

        const firstName = input.first_name.trim();
        const lastName = input.last_name.trim();
        const parentName = input.parent_name.trim();
        const parentPhone = input.parent_phone.trim();
        const parentEmail = input.parent_email.trim().toLowerCase();
        const isMinor = input.birth_year !== null
            && input.birth_year !== undefined
            && input.birth_year > new Date().getFullYear() - 18;

        if (!firstName) {
            throw new BadRequestException('Укажите имя ученика');
        }

        if (!lastName) {
            throw new BadRequestException('Укажите фамилию ученика');
        }

        if (isMinor && (!parentName || (!parentPhone && !parentEmail))) {
            throw new BadRequestException(
                'Для ученика младше 18 лет укажите родителя и его телефон или email',
            );
        }

        const fullName = `${firstName} ${lastName}`;
        const phone = this.nullable(input.phone);
        const result = await this.prisma.$transaction(async (transaction) => {
            const profile = await transaction.studentProfile.upsert({
                where: { userId: user.id },
                update: {
                    firstName,
                    lastName,
                    city: this.nullable(input.city),
                    timezone: this.nullable(input.timezone),
                    birthYear: input.birth_year ?? null,
                    classLevel: this.nullable(input.class_level),
                    subjects: this.nullable(input.subjects),
                    goal: this.nullable(input.goal),
                    learningGoals: this.nullable(input.learning_goals),
                    levelDescription: this.nullable(input.level_description),
                    lessonFormat: this.nullable(input.lesson_format),
                    parentName: this.nullable(parentName),
                    parentPhone: this.nullable(parentPhone),
                    parentEmail: this.nullable(parentEmail),
                    messenger: this.nullable(input.messenger),
                    contactPreference: this.nullable(input.contact_preference),
                    preferredTime: this.nullable(input.preferred_time),
                    scheduleComment: this.nullable(input.schedule_comment),
                    about: this.nullable(input.about),
                    profileVersion: 1,
                    profileCompletion: 100,
                },
                create: {
                    userId: user.id,
                    firstName,
                    lastName,
                    city: this.nullable(input.city),
                    timezone: this.nullable(input.timezone),
                    birthYear: input.birth_year ?? null,
                    classLevel: this.nullable(input.class_level),
                    subjects: this.nullable(input.subjects),
                    goal: this.nullable(input.goal),
                    learningGoals: this.nullable(input.learning_goals),
                    levelDescription: this.nullable(input.level_description),
                    lessonFormat: this.nullable(input.lesson_format),
                    parentName: this.nullable(parentName),
                    parentPhone: this.nullable(parentPhone),
                    parentEmail: this.nullable(parentEmail),
                    messenger: this.nullable(input.messenger),
                    contactPreference: this.nullable(input.contact_preference),
                    preferredTime: this.nullable(input.preferred_time),
                    scheduleComment: this.nullable(input.schedule_comment),
                    about: this.nullable(input.about),
                    profileVersion: 1,
                    profileCompletion: 100,
                },
            });
            const savedUser = await transaction.user.update({
                where: { id: user.id },
                data: {
                    fullName,
                    phone,
                    profileCompleted: true,
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    avatarUrl: true,
                    status: true,
                    emailVerifiedAt: true,
                    profileCompleted: true,
                },
            });

            return { profile, savedUser };
        });

        return {
            success: true,
            message: 'Анкета ученика сохранена',
            user: toPublicUser(result.savedUser),
            profile: this.studentProfileToApi(result.profile, result.savedUser.phone),
        };
    }

    async updateTeacherProfile(
        user: SessionUser,
        input: UpdateTeacherProfileDto,
    ): Promise<Record<string, unknown>> {
        this.requireRole(user, UserRole.TEACHER, 'преподавателю');

        const firstName = input.first_name.trim();
        const lastName = input.last_name.trim();
        const subjectIds = [...new Set(input.subject_ids)];
        const ageGroupIds = [...new Set(input.age_group_ids)];
        const price45 = this.price(input.price_45, '45 минут');
        const price60 = this.price(input.price_60, '60 минут');
        const price90 = this.price(input.price_90, '90 минут');
        const accessibilitySlots = input.accessibility_enabled
            ? this.integer(input.accessibility_slots, 1, 10, 'Количество учеников')
            : null;
        const education = input.education
            .map((item, index) => ({
                id: this.positiveInteger(item.id),
                institution: item.institution.trim(),
                faculty: this.nullable(item.faculty),
                speciality: this.nullable(item.speciality),
                qualification: this.nullable(item.qualification),
                graduationYear: this.integer(
                    item.graduation_year,
                    1950,
                    2100,
                    'Год окончания',
                ),
                description: this.nullable(item.description),
                isPrimary: item.is_primary,
                sortOrder: (index + 1) * 10,
            }))
            .filter((item) => item.institution);

        if (!firstName || !lastName) {
            throw new BadRequestException('Укажите имя и фамилию преподавателя');
        }

        if (price45 === null && price60 === null && price90 === null) {
            throw new BadRequestException(
                'Укажите стоимость хотя бы одной продолжительности занятия',
            );
        }

        if (education.length === 0) {
            throw new BadRequestException('Добавьте хотя бы одну запись об образовании');
        }

        const primaryIndex = Math.max(
            0,
            education.findIndex((item) => item.isPrimary),
        );
        education.forEach((item, index) => {
            item.isPrimary = index === primaryIndex;
        });

        const preparationPairs = new Map<string, {
            subjectId: number;
            preparationId: number;
        }>();

        for (const item of input.subject_preparations) {
            if (!subjectIds.includes(item.subject_id)) {
                throw new BadRequestException(
                    'Направление указано для предмета, который не выбран',
                );
            }

            for (const preparationId of item.preparation_ids) {
                preparationPairs.set(`${item.subject_id}:${preparationId}`, {
                    subjectId: item.subject_id,
                    preparationId,
                });
            }
        }

        await this.validateTeacherDictionaries(
            subjectIds,
            ageGroupIds,
            [...preparationPairs.values()],
        );

        const result = await this.prisma.$transaction(async (transaction) => {
            const existingEducation = await transaction.teacherEducation.findMany({
                where: { teacherId: user.id },
                select: { id: true },
            });
            const existingEducationIds = new Set(
                existingEducation.map((item) => item.id),
            );

            for (const item of education) {
                if (item.id !== null && !existingEducationIds.has(item.id)) {
                    throw new BadRequestException(
                        'Запись об образовании не принадлежит преподавателю',
                    );
                }
            }

            const profileData = {
                firstName,
                lastName,
                slug: `teacher-${user.id}`,
                city: input.city.trim(),
                timezone: this.nullable(input.timezone),
                headline: input.headline.trim(),
                experienceYears: input.experience_years,
                about: input.about.trim(),
                teachingMethod: input.teaching_method.trim(),
                firstLessonDescription: this.nullable(input.first_lesson_description),
                studentGets: this.nullable(input.student_gets),
                price45,
                price60,
                price90,
                trialLessonEnabled: input.trial_lesson_enabled,
                pricingComment: this.nullable(input.pricing_comment),
                scheduleDescription: input.schedule_description.trim(),
                accessibilityEnabled: input.accessibility_enabled,
                accessibilityFreeLessons: input.accessibility_enabled
                    && input.accessibility_free_lessons,
                accessibilityDiscount: input.accessibility_enabled
                    && input.accessibility_discount,
                accessibilityIndividual: input.accessibility_enabled
                    && input.accessibility_individual,
                accessibilitySlots,
                accessibilityComment: input.accessibility_enabled
                    ? this.nullable(input.accessibility_comment)
                    : null,
                introVideoUrl: this.nullable(input.intro_video_url),
                usesAuthorMaterials: input.uses_author_materials,
                sellsAuthorMaterials: input.sells_author_materials,
                authorMaterialsDescription: input.uses_author_materials
                    ? this.nullable(input.author_materials_description)
                    : null,
                verificationStatus: TeacherVerificationStatus.PENDING,
                verificationComment: null,
                verifiedById: null,
                verifiedAt: null,
                isVisible: false,
                profileVersion: 2,
                profileCompletion: 100,
            };

            const profile = await transaction.teacherProfile.upsert({
                where: { userId: user.id },
                update: profileData,
                create: { userId: user.id, ...profileData },
            });

            await transaction.teacherSubjectPreparation.deleteMany({
                where: { teacherId: user.id },
            });
            await transaction.teacherSubject.deleteMany({
                where: { teacherId: user.id },
            });
            await transaction.teacherAgeGroup.deleteMany({
                where: { teacherId: user.id },
            });

            await transaction.teacherSubject.createMany({
                data: subjectIds.map((subjectId) => ({
                    teacherId: user.id,
                    subjectId,
                })),
            });
            await transaction.teacherAgeGroup.createMany({
                data: ageGroupIds.map((ageGroupId) => ({
                    teacherId: user.id,
                    ageGroupId,
                })),
            });

            if (preparationPairs.size > 0) {
                await transaction.teacherSubjectPreparation.createMany({
                    data: [...preparationPairs.values()].map((item) => ({
                        teacherId: user.id,
                        ...item,
                    })),
                });
            }

            const retainedEducationIds: number[] = [];

            for (const item of education) {
                const { id, ...educationData } = item;

                if (id !== null) {
                    await transaction.teacherEducation.update({
                        where: { id },
                        data: educationData,
                    });
                    retainedEducationIds.push(id);
                    continue;
                }

                const created = await transaction.teacherEducation.create({
                    data: {
                        teacherId: user.id,
                        ...educationData,
                    },
                    select: { id: true },
                });
                retainedEducationIds.push(created.id);
            }

            await transaction.teacherEducation.deleteMany({
                where: {
                    teacherId: user.id,
                    id: { notIn: retainedEducationIds },
                },
            });

            const savedUser = await transaction.user.update({
                where: { id: user.id },
                data: {
                    fullName: `${firstName} ${lastName}`,
                    avatarUrl: this.nullable(input.photo_url),
                    profileCompleted: true,
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    avatarUrl: true,
                    status: true,
                    emailVerifiedAt: true,
                    profileCompleted: true,
                },
            });
            const savedEducation = await transaction.teacherEducation.findMany({
                where: { teacherId: user.id },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            });

            return { profile, savedUser, savedEducation };
        });

        return {
            success: true,
            message: 'Анкета преподавателя сохранена и отправлена на проверку',
            user: toPublicUser(result.savedUser),
            profile: this.teacherProfileToApi(result.profile, result.savedUser.avatarUrl),
            subject_ids: subjectIds,
            subject_preparations: input.subject_preparations,
            age_group_ids: ageGroupIds,
            education: result.savedEducation.map((item) => this.educationToApi(item)),
        };
    }

    private async getTeacherMe(
        user: SessionUser,
    ): Promise<Record<string, unknown>> {
        const [profile, subjects, preparations, ageGroups, education] = await Promise.all([
            this.prisma.teacherProfile.findUnique({ where: { userId: user.id } }),
            this.prisma.teacherSubject.findMany({
                where: { teacherId: user.id },
                include: { subject: { include: { group: true } } },
                orderBy: { subjectId: 'asc' },
            }),
            this.prisma.teacherSubjectPreparation.findMany({
                where: { teacherId: user.id },
                orderBy: [{ subjectId: 'asc' }, { preparationId: 'asc' }],
            }),
            this.prisma.teacherAgeGroup.findMany({
                where: { teacherId: user.id },
                include: { ageGroup: true },
                orderBy: { ageGroupId: 'asc' },
            }),
            this.prisma.teacherEducation.findMany({
                where: { teacherId: user.id },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            }),
        ]);
        const preparationIdsBySubject = new Map<number, number[]>();

        for (const link of preparations) {
            const ids = preparationIdsBySubject.get(link.subjectId) ?? [];
            ids.push(link.preparationId);
            preparationIdsBySubject.set(link.subjectId, ids);
        }

        return {
            success: true,
            user: toPublicUser(user),
            profile: profile ? this.teacherProfileToApi(profile, user.avatarUrl) : null,
            subjects: subjects.map(({ subject }) => ({
                id: subject.id,
                group_id: subject.groupId,
                name: subject.name,
                slug: subject.slug,
                group_name: subject.group.name,
            })),
            subject_ids: subjects.map((item) => item.subjectId),
            subject_preparations: [...preparationIdsBySubject.entries()].map(
                ([subjectId, preparationIds]) => ({
                    subject_id: subjectId,
                    preparation_ids: preparationIds,
                }),
            ),
            age_groups: ageGroups.map(({ ageGroup }) => ({
                id: ageGroup.id,
                name: ageGroup.name,
                slug: ageGroup.slug,
            })),
            age_group_ids: ageGroups.map((item) => item.ageGroupId),
            education: education.map((item) => this.educationToApi(item)),
            documents: [],
        };
    }

    private async validateTeacherDictionaries(
        subjectIds: number[],
        ageGroupIds: number[],
        preparationPairs: Array<{ subjectId: number; preparationId: number }>,
    ): Promise<void> {
        const [subjectCount, ageGroupCount, allowedPreparations] = await Promise.all([
            this.prisma.subject.count({
                where: {
                    id: { in: subjectIds },
                    isActive: true,
                    group: { isActive: true },
                },
            }),
            this.prisma.studentAgeGroup.count({
                where: { id: { in: ageGroupIds }, isActive: true },
            }),
            preparationPairs.length > 0
                ? this.prisma.subjectPreparation.findMany({
                    where: {
                        OR: preparationPairs.map((item) => ({
                            subjectId: item.subjectId,
                            preparationId: item.preparationId,
                            preparation: {
                                isActive: true,
                                group: { isActive: true },
                            },
                        })),
                    },
                    select: { subjectId: true, preparationId: true },
                })
                : Promise.resolve([]),
        ]);

        if (subjectCount !== subjectIds.length) {
            throw new BadRequestException(
                'Один или несколько выбранных предметов недоступны',
            );
        }

        if (ageGroupCount !== ageGroupIds.length) {
            throw new BadRequestException(
                'Одна или несколько возрастных групп недоступны',
            );
        }

        const allowedPairs = new Set(
            allowedPreparations.map(
                (item) => `${item.subjectId}:${item.preparationId}`,
            ),
        );

        if (
            preparationPairs.some(
                (item) => !allowedPairs.has(`${item.subjectId}:${item.preparationId}`),
            )
        ) {
            throw new BadRequestException(
                'Выбрано направление, недоступное для указанного предмета',
            );
        }
    }

    private teacherProfileToApi(
        profile: Record<string, unknown>,
        avatarUrl: string | null,
    ): Record<string, unknown> {
        const value = profile as Record<string, any>;

        return {
            id: value.id,
            user_id: value.userId,
            first_name: value.firstName,
            last_name: value.lastName,
            photo_url: avatarUrl,
            slug: value.slug,
            city: value.city,
            timezone: value.timezone,
            headline: value.headline,
            experience_years: value.experienceYears,
            about: value.about,
            teaching_method: value.teachingMethod,
            first_lesson_description: value.firstLessonDescription,
            student_gets: value.studentGets,
            price_45: value.price45?.toString() ?? null,
            price_60: value.price60?.toString() ?? null,
            price_90: value.price90?.toString() ?? null,
            trial_lesson_enabled: value.trialLessonEnabled,
            pricing_comment: value.pricingComment,
            schedule_description: value.scheduleDescription,
            accessibility_enabled: value.accessibilityEnabled,
            accessibility_free_lessons: value.accessibilityFreeLessons,
            accessibility_discount: value.accessibilityDiscount,
            accessibility_individual: value.accessibilityIndividual,
            accessibility_slots: value.accessibilitySlots,
            accessibility_comment: value.accessibilityComment,
            intro_video_url: value.introVideoUrl,
            uses_author_materials: value.usesAuthorMaterials,
            sells_author_materials: value.sellsAuthorMaterials,
            author_materials_description: value.authorMaterialsDescription,
            verification_status: this.teacherVerificationToApi(
                value.verificationStatus,
            ),
            verification_comment: value.verificationComment,
            verified_at: value.verifiedAt,
            profile_version: value.profileVersion,
            profile_completion: value.profileCompletion,
            is_visible: value.isVisible,
            created_at: value.createdAt,
            updated_at: value.updatedAt,
        };
    }

    private studentProfileToApi(
        profile: Record<string, unknown>,
        phone: string | null,
    ): Record<string, unknown> {
        const value = profile as Record<string, any>;

        return {
            id: value.id,
            user_id: value.userId,
            first_name: value.firstName,
            last_name: value.lastName,
            phone,
            city: value.city,
            timezone: value.timezone,
            birth_year: value.birthYear,
            class_level: value.classLevel,
            subjects: value.subjects,
            goal: value.goal,
            learning_goals: value.learningGoals,
            level_description: value.levelDescription,
            lesson_format: value.lessonFormat,
            parent_name: value.parentName,
            parent_phone: value.parentPhone,
            parent_email: value.parentEmail,
            messenger: value.messenger,
            contact_preference: value.contactPreference,
            preferred_time: value.preferredTime,
            schedule_comment: value.scheduleComment,
            about: value.about,
            profile_version: value.profileVersion,
            profile_completion: value.profileCompletion,
            created_at: value.createdAt,
            updated_at: value.updatedAt,
        };
    }

    private teacherVerificationToApi(
        status: TeacherVerificationStatus | null | undefined,
    ): string | null {
        if (!status) {
            return null;
        }

        return status === TeacherVerificationStatus.VERIFIED
            ? 'approved'
            : status.toLowerCase();
    }

    private educationToApi(item: Record<string, unknown>): Record<string, unknown> {
        const value = item as Record<string, any>;

        return {
            id: value.id,
            teacher_id: value.teacherId,
            institution: value.institution,
            faculty: value.faculty,
            speciality: value.speciality,
            qualification: value.qualification,
            graduation_year: value.graduationYear,
            description: value.description,
            is_primary: value.isPrimary,
            sort_order: value.sortOrder,
            created_at: value.createdAt,
            updated_at: value.updatedAt,
        };
    }

    private nullable(value: string): string | null {
        const normalized = value.trim();
        return normalized || null;
    }

    private price(value: unknown, label: string): string | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const number = Number(value);

        if (!Number.isFinite(number) || number <= 0 || number > 1_000_000) {
            throw new BadRequestException(
                `В поле «${label}» указана некорректная сумма`,
            );
        }

        return number.toFixed(2);
    }

    private integer(
        value: unknown,
        minimum: number,
        maximum: number,
        label: string,
    ): number | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const number = Number(value);

        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new BadRequestException(`Поле «${label}» заполнено некорректно`);
        }

        return number;
    }

    private positiveInteger(value: unknown): number | null {
        const number = Number(value);
        return Number.isInteger(number) && number > 0 ? number : null;
    }

    private requireRole(
        user: SessionUser,
        role: UserRole,
        label: string,
    ): void {
        if (user.role !== role) {
            throw new ForbiddenException(`Этот раздел доступен только ${label}`);
        }
    }
}
