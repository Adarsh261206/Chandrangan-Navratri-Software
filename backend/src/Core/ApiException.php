<?php

declare(strict_types=1);

namespace App\Core;

use Exception;

final class ApiException extends Exception
{
    /**
     * @param array<string, mixed> $extra Extra JSON payload fields (e.g. errors, matches).
     */
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly string $apiCode = 'error',
        public readonly array $extra = []
    ) {
        parent::__construct($message, $status);
    }

    public static function badRequest(string $message, string $code = 'bad_request'): self
    {
        return new self(400, $message, $code);
    }

    public static function unauthorized(string $message = 'Please sign in to continue.'): self
    {
        return new self(401, $message, 'unauthorized');
    }

    public static function forbidden(string $message = 'You do not have permission to do that.'): self
    {
        return new self(403, $message, 'forbidden');
    }

    public static function notFound(string $message = 'Not found.'): self
    {
        return new self(404, $message, 'not_found');
    }

    public static function conflict(string $message, string $code = 'conflict', array $extra = []): self
    {
        return new self(409, $message, $code, $extra);
    }

    /**
     * @param array<string, string> $errors
     */
    public static function validation(array $errors, string $message = 'Please fix the highlighted fields.'): self
    {
        return new self(422, $message, 'validation_failed', ['errors' => $errors]);
    }

    public static function tooMany(string $message = 'Too many attempts. Please wait and try again.'): self
    {
        return new self(429, $message, 'rate_limited');
    }

    public static function server(string $message = 'Something went wrong. Please try again.'): self
    {
        return new self(500, $message, 'server_error');
    }
}
