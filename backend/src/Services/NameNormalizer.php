<?php

declare(strict_types=1);

namespace App\Services;

final class NameNormalizer
{
    /**
     * Normalises a participant name for duplicate comparison:
     * trim, collapse internal whitespace, case-insensitive (Unicode aware).
     */
    public static function normalize(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;
        $name = mb_strtolower($name, 'UTF-8');
        return $name;
    }

    /** Normalises a free-text search query. */
    public static function search(string $query): string
    {
        $query = trim($query);
        $query = preg_replace('/\s+/u', ' ', $query) ?? $query;
        return mb_strtolower($query, 'UTF-8');
    }
}
