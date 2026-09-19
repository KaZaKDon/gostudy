require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const {
    constants,
    copyFile,
    mkdir,
    readFile,
    stat,
    unlink,
    chmod,
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

const TYPE_MAP = {
    diploma: 'DIPLOMA',
    certificate: 'CERTIFICATE',
    qualification: 'QUALIFICATION',
    other: 'OTHER',
};
const STATUS_MAP = {
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
};
const MIME_BY_EXTENSION = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};

function requiredPath(value, label) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new Error(`Не указан ${label}`);
    return resolve(normalized);
}

function safeChildPath(root, relativePath) {
    const target = resolve(root, String(relativePath || ''));
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

function optionalInteger(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
}

async function main() {
    const manifestPath = requiredPath(
        process.argv[2] || process.env.LEGACY_TEACHER_DOCUMENTS_MANIFEST,
        'путь к JSON-манифесту',
    );
    const legacyRoot = requiredPath(
        process.env.LEGACY_UPLOAD_PRIVATE_DIR,
        'LEGACY_UPLOAD_PRIVATE_DIR',
    );
    const privateRoot = resolve(
        String(process.env.UPLOAD_PRIVATE_DIR || 'storage/private'),
    );
    const connectionString = String(process.env.DATABASE_URL || '').trim();
    if (!connectionString) throw new Error('Не указан DATABASE_URL');

    const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : parsed.documents;
    if (!Array.isArray(rows)) {
        throw new Error('Манифест должен быть массивом или объектом { documents: [] }');
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
                const existing = await prisma.teacherDocument.findUnique({
                    where: { legacyId },
                    select: { id: true },
                });
                if (existing) {
                    skipped += 1;
                    continue;
                }

                const teacher = await prisma.user.findFirst({
                    where: { id: teacherId, role: 'TEACHER' },
                    select: { id: true },
                });
                if (!teacher) {
                    throw new Error(`Преподаватель ${teacherId} не найден в PostgreSQL`);
                }

                let educationId = optionalInteger(row.education_id);
                if (educationId) {
                    const education = await prisma.teacherEducation.findFirst({
                        where: { id: educationId, teacherId },
                        select: { id: true },
                    });
                    if (!education) educationId = null;
                }

                let checkedById = optionalInteger(row.checked_by);
                if (checkedById) {
                    const checker = await prisma.user.findFirst({
                        where: {
                            id: checkedById,
                            role: { in: ['ADMIN', 'MODERATOR'] },
                        },
                        select: { id: true },
                    });
                    if (!checker) checkedById = null;
                }

                const sourcePath = safeChildPath(legacyRoot, row.file_url);
                const sourceStat = await stat(sourcePath);
                if (!sourceStat.isFile()) throw new Error('Источник не является файлом');

                const extension = extname(sourcePath).toLowerCase();
                const mimeType = MIME_BY_EXTENSION[extension];
                if (!mimeType) throw new Error(`Неподдерживаемый формат ${extension}`);

                const relativeDirectory = join('teacher-documents', String(teacherId));
                const targetDirectory = safeChildPath(privateRoot, relativeDirectory);
                await mkdir(targetDirectory, { recursive: true, mode: 0o750 });
                const targetName = `${randomUUID()}${extension}`;
                const targetPath = join(targetDirectory, targetName);
                await copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
                await chmod(targetPath, 0o640);
                copiedPath = targetPath;

                const originalName = basename(String(row.original_name || targetName))
                    .slice(-255);
                const checkedAt = row.checked_at ? new Date(row.checked_at) : null;
                const createdAt = row.created_at ? new Date(row.created_at) : new Date();
                const updatedAt = row.updated_at ? new Date(row.updated_at) : createdAt;
                const type = TYPE_MAP[String(row.type || '').toLowerCase()] || 'OTHER';
                const status = STATUS_MAP[String(row.status || '').toLowerCase()]
                    || 'PENDING';

                await prisma.teacherDocument.create({
                    data: {
                        teacherId,
                        educationId,
                        type,
                        documentTitle: String(
                            row.document_title || basename(originalName, extension) || 'Документ',
                        ).slice(0, 255),
                        institution: row.institution
                            ? String(row.institution).slice(0, 255)
                            : null,
                        documentYear: optionalInteger(row.document_year),
                        storedPath: join(relativeDirectory, targetName).split(sep).join('/'),
                        originalName,
                        mimeType: String(row.mime_type || mimeType).slice(0, 100),
                        fileSize: BigInt(sourceStat.size),
                        status,
                        rejectionReason: row.reject_reason
                            ? String(row.reject_reason).slice(0, 2000)
                            : null,
                        checkedById,
                        checkedAt: checkedAt && !Number.isNaN(checkedAt.getTime())
                            ? checkedAt
                            : null,
                        sortOrder: optionalInteger(row.sort_order) || 100,
                        legacyId,
                        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
                        updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
                    },
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
