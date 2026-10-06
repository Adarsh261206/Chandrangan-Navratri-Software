<?php

declare(strict_types=1);

namespace App\Core;

final class Auth
{
    public static function check(): bool
    {
        $user = Session::get('user');
        return is_array($user) && isset($user['id']);
    }

    /** @return array<string, mixed>|null */
    public static function user(): ?array
    {
        $user = Session::get('user');
        return is_array($user) ? $user : null;
    }

    /** @return array<string, mixed> */
    public static function require(): array
    {
        $user = self::user();
        if ($user === null) {
            throw ApiException::unauthorized();
        }
        return $user;
    }

    public static function login(array $user): void
    {
        Session::regenerate();
        Session::set('user', [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
        ]);
        Session::set('csrf_token', bin2hex(random_bytes(24)));
        Session::set('last_activity', time());
    }

    public static function logout(): void
    {
        Session::destroy();
    }
}
