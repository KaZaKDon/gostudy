<?php
declare(strict_types=1);

function writeAdminLog(
    PDO $pdo,
    int $adminId,
    string $action,
    string $entityType,
    int $entityId,
    array $oldValue = [],
    array $newValue = []
): void {
    unset($pdo);

    $event = [
        'event' => 'admin_audit',
        'occurred_at' => gmdate('c'),
        'admin_id' => $adminId,
        'action' => $action,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'old_value' => $oldValue,
        'new_value' => $newValue,
    ];

    try {
        $json = json_encode(
            $event,
            JSON_THROW_ON_ERROR
            | JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
            | JSON_INVALID_UTF8_SUBSTITUTE
        );

        error_log($json);
    } catch (JsonException $error) {
        error_log(sprintf(
            'admin_audit encode_error admin_id=%d action=%s entity=%s:%d',
            $adminId,
            $action,
            $entityType,
            $entityId
        ));
    }
}