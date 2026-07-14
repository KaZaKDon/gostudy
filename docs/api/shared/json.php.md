<?php

function getJsonInput(): array
{
    $input = file_get_contents('php://input');

    if (!$input) {
        return [];
    }

    $decoded = json_decode($input, true);

    return is_array($decoded)
        ? $decoded
        : [];
}
