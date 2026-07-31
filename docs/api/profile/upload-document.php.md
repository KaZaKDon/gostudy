<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/upload.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Метод не поддерживается', 405);
}

$user = requireAuth();

if ($user['role'] !== 'teacher') {
    errorResponse('Документы может загружать только преподаватель', 403);
}

$type = trim((string) ($_POST['type'] ?? ''));
$allowedTypes = ['diploma', 'certificate', 'qualification', 'other'];

if (!in_array($type, $allowedTypes, true)) {
    errorResponse('Некорректный тип документа');
}

$documentTitle = trim((string) ($_POST['document_title'] ?? ''));
$institution = trim((string) ($_POST['institution'] ?? ''));
$documentYearValue = trim((string) ($_POST['document_year'] ?? ''));
$educationIdValue = trim((string) ($_POST['education_id'] ?? ''));

if (mb_strlen($documentTitle) > 255 || mb_strlen($institution) > 255) {
    errorResponse('Название документа или организации слишком длинное');
}

$documentYear = null;

if ($documentYearValue !== '') {
    $documentYear = filter_var($documentYearValue, FILTER_VALIDATE_INT);

    if ($documentYear === false || $documentYear < 1950 || $documentYear > 2100) {
        errorResponse('Некорректный год документа');
    }
}

$educationId = null;

if ($educationIdValue !== '') {
    $educationId = filter_var($educationIdValue, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    if ($educationId === false) {
        errorResponse('Некорректная запись об образовании');
    }
}

$file = receiveUploadedFile(
    'file',
    effectiveUploadMaxBytes('UPLOAD_DOCUMENT_MAX_BYTES', 10 * 1024 * 1024),
    [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ]
);

if ($documentTitle === '') {
    $documentTitle = pathinfo($file['original_name'], PATHINFO_FILENAME);
    $documentTitle = mb_substr($documentTitle !== '' ? $documentTitle : 'Документ', 0, 255);
}

$storedPath = null;

try {
    $pdo = getDatabaseConnection();

    if ($educationId !== null) {
        $educationStmt = $pdo->prepare("
            SELECT id
            FROM teacher_education
            WHERE id = :id
              AND teacher_id = :teacher_id
            LIMIT 1
        ");
        $educationStmt->execute([
            'id' => $educationId,
            'teacher_id' => $user['id'],
        ]);

        if (!$educationStmt->fetchColumn()) {
            errorResponse('Запись об образовании не принадлежит преподавателю');
        }
    }

    $storedPath = storeUploadedFile(
        $file,
        uploadPrivateRoot(),
        'teacher-documents/' . $user['id'],
        0750,
        0640
    );

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare("
        INSERT INTO teacher_documents (
            teacher_id,
            education_id,
            type,
            document_title,
            institution,
            document_year,
            file_url,
            original_name,
            mime_type,
            file_size,
            status,
            sort_order
        ) VALUES (
            :teacher_id,
            :education_id,
            :type,
            :document_title,
            :institution,
            :document_year,
            :file_url,
            :original_name,
            :mime_type,
            :file_size,
            'pending',
            100
        )
    ");
    $insertStmt->execute([
        'teacher_id' => $user['id'],
        'education_id' => $educationId,
        'type' => $type,
        'document_title' => $documentTitle,
        'institution' => $institution !== '' ? $institution : null,
        'document_year' => $documentYear,
        'file_url' => $storedPath,
        'original_name' => $file['original_name'],
        'mime_type' => $file['mime_type'],
        'file_size' => $file['size'],
    ]);
    $documentId = (int) $pdo->lastInsertId();

    $profileStmt = $pdo->prepare("
        UPDATE teacher_profiles
        SET is_verified = 0,
            verification_status = 'pending',
            verification_comment = NULL,
            verified_by = NULL,
            verified_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :user_id
    ");
    $profileStmt->execute(['user_id' => $user['id']]);

    $pdo->commit();

    successResponse([
        'message' => 'Документ загружен и отправлен на проверку',
        'document' => [
            'id' => $documentId,
            'education_id' => $educationId,
            'type' => $type,
            'document_title' => $documentTitle,
            'institution' => $institution !== '' ? $institution : null,
            'document_year' => $documentYear,
            'original_name' => $file['original_name'],
            'mime_type' => $file['mime_type'],
            'file_size' => $file['size'],
            'status' => 'pending',
            'reject_reason' => null,
        ],
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($storedPath !== null) {
        deleteStoredFile(uploadPrivateRoot(), $storedPath);
    }

    error_log('upload-document.php: ' . $error->getMessage());
    errorResponse('Не удалось загрузить документ', 500);
}
