<?php

declare(strict_types=1);

$env = static function (string $key, string $default = ''): string {
    $value = getenv($key);
    return $value === false ? $default : $value;
};

$isDev = $env('NAV_ENV', 'production') === 'development';

$config = [
    'app' => [
        'env' => $isDev ? 'development' : 'production',
        'debug' => $isDev,
        'cors_origin' => $env('NAV_CORS_ORIGIN', ''),
        'timezone' => $env('NAV_TIMEZONE', 'Asia/Kolkata'),
    ],
    'db' => [
        'host' => $env('NAV_DB_HOST', '127.0.0.1'),
        'port' => (int) $env('NAV_DB_PORT', '3306'),
        'name' => $env('NAV_DB_NAME', 'navratrotsav'),
        'user' => $env('NAV_DB_USER', 'root'),
        'pass' => $env('NAV_DB_PASS', ''),
        'charset' => 'utf8mb4',
    ],
    'session' => [
        'name' => 'nav_session',
        'timeout' => 8 * 60 * 60,
    ],
    'security' => [
        'login_max_attempts' => 8,
        'login_window_seconds' => 900,
        'csrf_header' => 'X-CSRF-Token',
        'password_min' => 8,
    ],
    'uploads' => [
        'dir' => dirname(__DIR__) . '/uploads',
        'url' => '/api/uploads',
        'max_bytes' => 6 * 1024 * 1024,
        'max_dimension' => 800,
        'thumb_dimension' => 320,
        'quality' => 80,
        'thumb_quality' => 72,
        'allowed_mime' => ['image/jpeg', 'image/png', 'image/webp'],
    ],
    'storage' => [
        'rate_limit_dir' => dirname(__DIR__) . '/storage/ratelimit',
        'log_file' => dirname(__DIR__) . '/storage/logs/app.log',
    ],
];

$localFile = __DIR__ . '/config.local.php';
if (is_file($localFile)) {
    $overrides = require $localFile;
    if (is_array($overrides)) {
        $config = array_replace_recursive($config, $overrides);
    }
}

return $config;
