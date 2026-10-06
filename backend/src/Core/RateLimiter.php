<?php

declare(strict_types=1);

namespace App\Core;

final class RateLimiter
{
    /**
     * @throws ApiException when the limit is exceeded
     */
    public static function hit(string $key, int $maxAttempts, int $windowSeconds): void
    {
        $dir = self::dir();
        if ($dir === null) {
            return;
        }

        $file = $dir . '/' . sha1($key) . '.json';
        $now = time();

        $attempts = [];
        if (is_file($file)) {
            $raw = file_get_contents($file);
            $decoded = $raw !== false ? json_decode($raw, true) : null;
            if (is_array($decoded)) {
                $attempts = array_values(array_filter($decoded, static fn ($t): bool => is_int($t) && ($now - $t) < $windowSeconds));
            }
        }

        if (count($attempts) >= $maxAttempts) {
            $oldest = min($attempts);
            $retryAfter = max(1, $windowSeconds - ($now - $oldest));
            throw ApiException::tooMany('Too many attempts. Please try again in ' . ceil($retryAfter / 60) . ' minute(s).');
        }

        $attempts[] = $now;
        file_put_contents($file, json_encode($attempts), LOCK_EX);
    }

    public static function clear(string $key): void
    {
        $dir = self::dir();
        if ($dir === null) {
            return;
        }
        $file = $dir . '/' . sha1($key) . '.json';
        if (is_file($file)) {
            @unlink($file);
        }
    }

    private static function dir(): ?string
    {
        $path = self::$dir;
        if ($path === null) {
            return null;
        }
        if (!is_dir($path)) {
            @mkdir($path, 0775, true);
        }
        return is_dir($path) && is_writable($path) ? $path : null;
    }

    private static ?string $dir = null;

    public static function configure(string $dir): void
    {
        self::$dir = $dir;
    }
}
