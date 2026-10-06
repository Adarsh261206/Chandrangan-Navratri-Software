<?php

declare(strict_types=1);

namespace App\Core;

final class Response
{
    /**
     * @param array<string, mixed> $extra
     */
    public static function success(mixed $data = null, string $message = '', int $status = 200, array $extra = []): never
    {
        $payload = ['success' => true, 'data' => $data, 'message' => $message];
        self::json(array_merge($payload, $extra), $status);
    }

    /**
     * @param array<string, mixed> $extra
     */
    public static function error(string $message, int $status = 400, string $code = 'error', array $extra = []): never
    {
        $payload = ['success' => false, 'message' => $message, 'code' => $code];
        self::json(array_merge($payload, $extra), $status);
    }

    /** @param array<string, mixed> $payload */
    public static function json(array $payload, int $status = 200): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: no-store');
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
