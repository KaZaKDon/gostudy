<?php

declare(strict_types=1);

http_response_code(404);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Robots-Tag: noindex, nofollow, noarchive');

$indexFile = __DIR__ . '/index.html';

if (!is_file($indexFile)) {
    echo '<!doctype html><html lang="ru"><head><meta charset="UTF-8">';
    echo '<meta name="robots" content="noindex, nofollow">';
    echo '<title>Страница не найдена — GoStudy</title></head>';
    echo '<body><h1>Страница не найдена</h1></body></html>';
    exit;
}

readfile($indexFile);
