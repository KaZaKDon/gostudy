<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

return [

    /*
    |--------------------------------------------------------------------------
    | SMTP
    |--------------------------------------------------------------------------
    */

    'host' => env('MAIL_HOST', ''),
    'port' => (int) env('MAIL_PORT', '465'),

    'encryption' => env('MAIL_ENCRYPTION', 'ssl'),

    'username' => env('MAIL_USERNAME', ''),
    'password' => env('MAIL_PASSWORD', ''),

    /*
    |--------------------------------------------------------------------------
    | Отправитель
    |--------------------------------------------------------------------------
    */

    'from_email' => env('MAIL_FROM_ADDRESS', ''),
    'from_name'  => env('MAIL_FROM_NAME', 'GoStudy'),

];