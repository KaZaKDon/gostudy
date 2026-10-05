import { Injectable } from '@nestjs/common';

import { normalizeUploadedFileName } from '../../common/files/upload-file-name';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';

type StorageCategoryId =
    | 'profile'
    | 'documents'
    | 'messages'
    | 'homework'
    | 'classroom'
    | 'disputes'
    | 'materials';

type StorageCategoryRow = {
    category: StorageCategoryId;
    used_bytes: bigint;
    file_count: bigint;
};

type StorageFileRow = {
    source_type: string;
    file_id: number;
    category: StorageCategoryId;
    original_name: string;
    file_size: bigint;
    created_at: Date;
    entity_id: number;
    context_title: string | null;
};

const CATEGORY_ORDER: StorageCategoryId[] = [
    'profile',
    'documents',
    'messages',
    'homework',
    'classroom',
    'disputes',
    'materials',
];

const ROLE_CATEGORIES: Partial<Record<UserRole, StorageCategoryId[]>> = {
    [UserRole.TEACHER]: CATEGORY_ORDER,
    [UserRole.STUDENT]: ['messages', 'homework', 'disputes'],
    [UserRole.PARENT]: ['messages', 'disputes'],
};

const LARGEST_FILES_LIMIT = 10;

@Injectable()
export class StorageInventoryService {
    constructor(private readonly prisma: PrismaService) {}

    async getInventory(user: SessionUser) {
        const ownedFiles = this.ownedFiles(user.id);
        const [categoryRows, fileRows] = await Promise.all([
            this.prisma.$queryRaw<StorageCategoryRow[]>(Prisma.sql`
                WITH "owned_files" AS (${ownedFiles})
                SELECT
                    "category",
                    SUM("file_size")::BIGINT AS "used_bytes",
                    COUNT(*)::BIGINT AS "file_count"
                FROM "owned_files"
                GROUP BY "category"
            `),
            this.prisma.$queryRaw<StorageFileRow[]>(Prisma.sql`
                WITH "owned_files" AS (${ownedFiles})
                SELECT
                    "source_type",
                    "file_id",
                    "category",
                    "original_name",
                    "file_size",
                    "created_at",
                    "entity_id",
                    "context_title"
                FROM "owned_files"
                ORDER BY "file_size" DESC, "created_at" DESC, "file_id" DESC
                LIMIT ${LARGEST_FILES_LIMIT}
            `),
        ]);

        const totals = new Map(
            categoryRows.map((row) => [row.category, row]),
        );
        const visibleCategories = new Set<StorageCategoryId>(
            ROLE_CATEGORIES[user.role] || [],
        );
        categoryRows.forEach((row) => visibleCategories.add(row.category));

        return {
            categories: CATEGORY_ORDER
                .filter((category) => visibleCategories.has(category))
                .map((category) => {
                    const row = totals.get(category);

                    return {
                        id: category,
                        used_bytes: Number(row?.used_bytes ?? 0n),
                        file_count: Number(row?.file_count ?? 0n),
                    };
                }),
            largest_files: fileRows.map((row) => ({
                id: `${row.source_type}:${row.file_id}`,
                file_id: row.file_id,
                source_type: row.source_type,
                category: row.category,
                name: normalizeUploadedFileName(row.original_name),
                size_bytes: Number(row.file_size),
                created_at: row.created_at.toISOString(),
                entity_id: row.entity_id,
                context_title: row.context_title,
            })),
        };
    }

    private ownedFiles(userId: number): Prisma.Sql {
        return Prisma.sql`
            SELECT
                'profile'::TEXT AS "category",
                CASE
                    WHEN media."type" = 'PHOTO' THEN 'profile_photo'
                    ELSE 'profile_video'
                END::TEXT AS "source_type",
                media."id" AS "file_id",
                media."original_name" AS "original_name",
                media."file_size"::BIGINT AS "file_size",
                media."created_at" AS "created_at",
                media."id" AS "entity_id",
                CASE
                    WHEN media."type" = 'PHOTO' THEN 'Фотография профиля'
                    ELSE 'Видеовизитка'
                END::TEXT AS "context_title"
            FROM "teacher_profile_media" AS media
            WHERE media."teacher_id" = ${userId}

            UNION ALL
            SELECT
                'documents',
                'teacher_document',
                document."id",
                document."original_name",
                document."file_size"::BIGINT,
                document."created_at",
                document."id",
                document."document_title"::TEXT
            FROM "teacher_documents" AS document
            WHERE document."teacher_id" = ${userId}

            UNION ALL
            SELECT
                'messages',
                'message_attachment',
                attachment."id",
                attachment."original_name",
                attachment."file_size"::BIGINT,
                attachment."created_at",
                message."dialog_id",
                NULL::TEXT
            FROM "message_attachments" AS attachment
            INNER JOIN "messages" AS message
                ON message."id" = attachment."message_id"
            WHERE message."sender_id" = ${userId}

            UNION ALL
            SELECT
                'homework',
                'homework_attachment',
                attachment."id",
                attachment."original_name",
                attachment."file_size"::BIGINT,
                attachment."created_at",
                homework."id",
                homework."title"::TEXT
            FROM "homework_attachments" AS attachment
            INNER JOIN "homework" AS homework
                ON homework."id" = attachment."homework_id"
            WHERE homework."teacher_id" = ${userId}

            UNION ALL
            SELECT
                'homework',
                'homework_submission_attachment',
                attachment."id",
                attachment."original_name",
                attachment."file_size"::BIGINT,
                attachment."created_at",
                homework."id",
                homework."title"::TEXT
            FROM "homework_submission_attachments" AS attachment
            INNER JOIN "homework_submissions" AS submission
                ON submission."id" = attachment."submission_id"
            INNER JOIN "homework" AS homework
                ON homework."id" = submission."homework_id"
            WHERE submission."student_id" = ${userId}

            UNION ALL
            SELECT
                'classroom',
                'classroom_file',
                file."id",
                file."original_name",
                file."file_size"::BIGINT,
                file."created_at",
                file."lesson_id",
                NULL::TEXT
            FROM "lesson_files" AS file
            WHERE file."uploaded_by" = ${userId}

            UNION ALL
            SELECT
                'disputes',
                'lesson_dispute_attachment',
                attachment."id",
                attachment."original_name",
                attachment."file_size"::BIGINT,
                attachment."created_at",
                attachment."dispute_id",
                'Спор по уроку'::TEXT
            FROM "lesson_dispute_attachments" AS attachment
            WHERE attachment."uploaded_by" = ${userId}

            UNION ALL
            SELECT
                'materials',
                'material_item',
                item."id",
                COALESCE(item."original_name", item."title"),
                item."file_size"::BIGINT,
                item."created_at",
                material."id",
                material."title"::TEXT
            FROM "material_items" AS item
            INNER JOIN "learning_materials" AS material
                ON material."id" = item."material_id"
            WHERE material."creator_id" = ${userId}
              AND material."owner_type" = 'TEACHER'
              AND item."file_size" IS NOT NULL
        `;
    }
}
