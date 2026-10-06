<?php

/**
 * Router script for PHP's built-in development server.
 *
 *   NAV_ENV=development php -S 127.0.0.1:8080 -t backend backend/router.php
 */

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = is_string($uri) ? $uri : '/';

// Strip an optional /api prefix so local URLs match the production mount point.
$query = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_QUERY);
if (str_starts_with($uri, '/api/')) {
    $uri = substr($uri, 4);
} elseif ($uri === '/api') {
    $uri = '/';
}
$_SERVER['REQUEST_URI'] = $uri . ($query !== null && $query !== '' ? '?' . $query : '');
$_SERVER['PATH_INFO'] = $uri;

$file = realpath(__DIR__ . '/' . ltrim($uri, '/'));

if ($file !== false && is_file($file) && str_starts_with($file, realpath(__DIR__))) {
    // Serve existing static files (uploads, etc.) directly.
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (in_array($extension, ['webp', 'png', 'jpg', 'jpeg', 'svg', 'ico', 'css', 'js'], true)) {
        $types = [
            'webp' => 'image/webp', 'png' => 'image/png', 'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg', 'svg' => 'image/svg+xml', 'ico' => 'image/x-icon',
            'css' => 'text/css', 'js' => 'application/javascript',
        ];
        header('Content-Type: ' . $types[$extension]);
        header('Cache-Control: public, max-age=3600');
        readfile($file);
        return true;
    }
}

require __DIR__ . '/index.php';
