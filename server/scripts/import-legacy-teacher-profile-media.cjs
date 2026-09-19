require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const {
    chmod,
    constants,
    copyFile,
    mkdir,
    readFile,
    stat,
    unlink,
} = require('node:fs/promises');
const {
    basename,
    extname,
    join,
    resolve,
    sep,
} = require('node:path');
const { randomUUID } = require('node:crypto');

const { PrismaClient } = require('../dist/generated/prisma/client');

const TYPE_MAP = { photo: 'PHOTO', video: 'VIDEO' };
const STATUS_MAP = {
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    replaced: 'REPLACED',
};
const MIME_BY_EXTENSION = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
};

function requiredPath(value, label) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new Error(`Не указан ${label}`);
    return resolve(normalized);
}

function safeChildPath(root, relativePath) {
    const normalized = String(relativePath || '').replace(/^[/\\]+/, '');
    const target = resolve(root, normalized);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
        throw new Error(`Недопустимый путь старого файла: ${relativePath}`);
    }
    return target;
}

function positiveInteger(value, label) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) {
        throw new Error(`Некорректное значение ${label}: ${value}`);
    }
    return number;
}

function optionalDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
    const manifestPath = requiredPath(
        process.argv[2] || process.env.LEGACY_TEACHER_PROFILE_MEDIA_MANIFEST,
        'путь к JSON-манифесту',
    );
    const legacyRoot = requiredPath(
        process.env.LEGACY_UPLOAD_PRIVATE_DIR,
        'LEGACY_UPLOAD_PRIVATE_DIR',
    );
    const privateRoot = resolve(
        String(process.env.UPLOAD_PRIVATE_DIR || 'storage/private'),
    );
    const apiUrl = String(process.env.API_URL || '').trim().replace(/\/$/, '');
    const connectionString = String(process.env.DATABASE_URL || '').trim();
    if (!connectionString) throw new Error('Не указан DATABASE_URL');
    if (!apiUrl) throw new Error('Не указан API_URL');

    const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : parsed.media;
    if (!Array.isArray(rows)) {
        throw new Error('Манифест должен быть массивом или объектом { media: [] }');
    }

    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
    });
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    try {
        for (const row of rows) {
            let copiedPath = null;
            try {
                const legacyId = positiveInteger(row.id, 'id');
                const teacherId = positiveInteger(row.teacher_id, 'teacher_id');
                const existing = await prisma.teacherProfileMedia.findUnique({
                    where: { legacyId },
                    select: { id: true },
                });
                if (existing) {
                    skipped += 1;
                    continue;
                }

                const type = TYPE_MAP[String(row.type || '').toLowerCase()];
                if (!type) throw new Error('Тип должен быть photo или video');
                const teacher = await prisma.user.findFirst({
                    where: { id: teacherId, role: 'TEACHER' },
                    select: {
                        id: true,
                        teacherProfile: { select: { id: true } },
                    },
                });
                if (!teacher) {
                    throw new Error(`Преподаватель ${teacherId} не найден в PostgreSQL`);
                }
                if (type === 'VIDEO' && !teacher.teacherProfile) {
                    throw new Error(`У преподавателя ${teacherId} отсутствует анкета`);
                }

                const sourcePath = safeChildPath(legacyRoot, row.file_url);
                const sourceStat = await stat(sourcePath);
                if (!sourceStat.isFile()) throw new Error('Источник не является файлом');
                const extension = extname(sourcePath).toLowerCase();
                const mimeType = MIME_BY_EXTENSION[extension];
                if (!mimeType) throw new Error(`Неподдерживаемый формат ${extension}`);
                if (type === 'PHOTO' && !mimeType.startsWith('image/')) {
                    throw new Error('Файл фотографии должен быть изображением');
                }
                if (type === 'VIDEO' && !mimeType.startsWith('video/')) {
                    throw new Error('Файл видеовизитки должен быть видео');
                }

                const relativeDirectory = join(
                    'teacher-profile-media',
                    String(teacherId),
                    type.toLowerCase(),
                );
                const targetDirectory = safeChildPath(privateRoot, relativeDirectory);
                await mkdir(targetDirectory, { recursive: true, mode: 0o750 });
                const targetName = `${randomUUID()}${extension}`;
                const targetPath = join(targetDirectory, targetName);
                await copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
                await chmod(targetPath, 0o640);
                copiedPath = targetPath;

                const status = STATUS_MAP[String(row.status || 'approved').toLowerCase()]
                    || 'APPROVED';
                const originalName = basename(String(row.original_name || targetName))
                    .slice(-255);
                const createdAt = optionalDate(row.created_at) || new Date();
                const updatedAt = optionalDate(row.updated_at) || createdAt;
                const checkedAt = optionalDate(row.checked_at);

                await prisma.$transaction(async (transaction) => {
                    if (status === 'APPROVED') {
                        await transaction.teacherProfileMedia.updateMany({
                            where: { teacherId, type, status: 'APPROVED' },
                            data: { status: 'REPLACED' },
                        });
                    }

                    const media = await transaction.teacherProfileMedia.create({
                        data: {
                            teacherId,
                            type,
                            storedPath: join(relativeDirectory, targetName)
                                .split(sep)
                                .join('/'),
                            originalName,
                            mimeType,
                            fileSize: BigInt(sourceStat.size),
                            status,
                            rejectionReason: row.reject_reason
                                ? String(row.reject_reason).slice(0, 2000)
                                : null,
                            checkedAt,
                            publishedAt: status === 'APPROVED'
                                ? optionalDate(row.published_at) || checkedAt || createdAt
                                : null,
                            legacyId,
                            createdAt,
                            updatedAt,
                        },
                    });

                    if (status === 'APPROVED') {
                        const publicUrl = `${apiUrl}/api/v1/teachers/profile-media/${media.id}`;
                        if (type === 'PHOTO') {
                            await transaction.user.update({
                                where: { id: teacherId },
                                data: { avatarUrl: publicUrl },
                            });
                        } else {
                            await transaction.teacherProfile.update({
                                where: { userId: teacherId },
                                data: { introVideoUrl: publicUrl },
                            });
                        }
                    }
                });

                copiedPath = null;
                imported += 1;
            } catch (error) {
                failed += 1;
                if (copiedPath) await unlink(copiedPath).catch(() => undefined);
                process.stderr.write(`Ошибка строки ${row?.id ?? '?'}: ${error.message}\n`);
            }
        }
    } finally {
        await prisma.$disconnect();
    }

    process.stdout.write(
        `Импорт завершён: добавлено ${imported}, пропущено ${skipped}, ошибок ${failed}.\n`,
    );
    if (failed) process.exitCode = 1;
}

main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
});
