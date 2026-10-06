<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\ApiException;
use App\Core\AppConfig;
use App\Core\Auth;
use App\Core\Csrf;
use App\Core\Database;
use App\Core\RateLimiter;

final class AuthService
{
    public function __construct(private readonly AppConfig $config)
    {
    }

    /** @return array{user: array<string, mixed>, csrf: string} */
    public function login(string $username, string $password, string $ip): array
    {
        $username = mb_strtolower(trim($username));
        $key = 'login:' . $ip . '|' . $username;

        RateLimiter::hit(
            $key,
            (int) $this->config->get('security.login_max_attempts', 8),
            (int) $this->config->get('security.login_window_seconds', 900)
        );

        $row = Database::one(
            'SELECT id, username, password_hash, is_active FROM admins WHERE username = ? LIMIT 1',
            [$username]
        );

        // Constant-ish work factor even when the user does not exist.
        $hash = is_array($row) && is_string($row['password_hash'])
            ? $row['password_hash']
            : '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';

        $valid = password_verify($password, $hash);

        if (!is_array($row) || !$valid) {
            AuditLogger::log(null, 'login_failed', 'admin', null, ['username' => $username]);
            throw ApiException::unauthorized('Invalid username or password.');
        }

        if ((int) $row['is_active'] !== 1) {
            throw ApiException::forbidden('This account has been disabled.');
        }

        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            Database::run('UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
                password_hash($password, PASSWORD_DEFAULT),
                $row['id'],
            ]);
        }

        RateLimiter::clear($key);

        Auth::login([
            'id' => (int) $row['id'],
            'username' => (string) $row['username'],
        ]);

        AuditLogger::log((int) $row['id'], 'login', 'admin', (int) $row['id']);

        return [
            'user' => Auth::user() ?? [],
            'csrf' => Csrf::token(),
        ];
    }

    public function logout(): void
    {
        $user = Auth::user();
        if ($user !== null) {
            AuditLogger::log((int) $user['id'], 'logout', 'admin', (int) $user['id']);
        }
        Auth::logout();
    }

    /** @return array{user: array<string, mixed>, csrf: string} */
    public function me(): array
    {
        $user = Auth::require();
        return [
            'user' => $user,
            'csrf' => Csrf::token(),
        ];
    }

    public function changePassword(array $user, string $current, string $newPassword): void
    {
        $min = (int) $this->config->get('security.password_min', 8);
        if (mb_strlen($newPassword) < $min) {
            throw ApiException::validation(['new_password' => 'New password must be at least ' . $min . ' characters.']);
        }

        $row = Database::one('SELECT password_hash FROM admins WHERE id = ?', [(int) $user['id']]);
        if ($row === null || !password_verify($current, (string) $row['password_hash'])) {
            throw ApiException::validation(['current_password' => 'Current password is incorrect.']);
        }

        Database::run('UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
            password_hash($newPassword, PASSWORD_DEFAULT),
            (int) $user['id'],
        ]);

        AuditLogger::log((int) $user['id'], 'password_changed', 'admin', (int) $user['id']);
    }
}
