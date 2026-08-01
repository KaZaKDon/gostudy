<?php

require_once __DIR__ . '/../shared/require-moderator.php';

$auth = requireAdminOrModerator();

adminJsonResponse([
    'success' => true,
    'data' => [
        'user' => $auth['user'],
    ],
]);