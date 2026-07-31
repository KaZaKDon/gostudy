<?php

declare(strict_types=1);

function lessonPlatformTimezone(): DateTimeZone
{
    static $timezone = null;

    if ($timezone instanceof DateTimeZone) {
        return $timezone;
    }

    $appConfig = require __DIR__ . '/../config/app.php';
    $timezoneName = trim((string) ($appConfig['timezone'] ?? 'Europe/Moscow'));

    try {
        $timezone = new DateTimeZone($timezoneName);
    } catch (Throwable) {
        $timezone = new DateTimeZone('Europe/Moscow');
    }

    return $timezone;
}

function lessonResolveTimezone(?string $timezoneName): DateTimeZone
{
    $normalizedName = trim((string) $timezoneName);

    if ($normalizedName === '') {
        return lessonPlatformTimezone();
    }

    try {
        return new DateTimeZone($normalizedName);
    } catch (Throwable) {
        return lessonPlatformTimezone();
    }
}

function lessonParseLocalDateTime(
    string $value,
    DateTimeZone $timezone
): ?DateTimeImmutable {
    $date = DateTimeImmutable::createFromFormat(
        '!Y-m-d\\TH:i',
        $value,
        $timezone
    );

    if (!$date || $date->format('Y-m-d\\TH:i') !== $value) {
        return null;
    }

    return $date;
}

function lessonToStorageDateTime(DateTimeInterface $date): string
{
    return DateTimeImmutable::createFromInterface($date)
        ->setTimezone(lessonPlatformTimezone())
        ->format('Y-m-d H:i:s');
}

function lessonFromStorageDateTime(
    ?string $value,
    DateTimeZone $viewerTimezone
): ?string {
    if ($value === null || trim($value) === '') {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat(
        '!Y-m-d H:i:s',
        $value,
        lessonPlatformTimezone()
    );

    if (!$date) {
        return null;
    }

    return $date
        ->setTimezone($viewerTimezone)
        ->format('Y-m-d H:i:s');
}
