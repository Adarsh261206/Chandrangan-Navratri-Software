<?php

declare(strict_types=1);

namespace App\Core;

final class Csrf
{
    public static function token(): string
    {
        $token = Session::get('csrf_token');
        if (!is_string($token) || $token === '') {
            $token = bin2hex(random_bytes(24));
            Session::set('csrf_token', $token);
        }
        return $token;
    }

    public static function validate(Request $request): void
    {
        $expected = Session::get('csrf_token');
        if (!is_string($expected) || $expected === '') {
            throw ApiException::forbidden('Your session has expired. Please sign in again.');
        }

        $provided = $request->header('X-CSRF-Token');
        if (!is_string($provided) || $provided === '' || !hash_equals($expected, $provided)) {
            throw ApiException::forbidden('Invalid security token. Please refresh and try again.');
        }
    }
}
