<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Core\Database;

final class HealthController
{
    public static function check(AppConfig $config): array
    {
        $database = 'ok';
        try {
            Database::scalar('SELECT 1');
        } catch (\Throwable) {
            $database = 'unavailable';
        }

        return [
            'data' => [
                'status' => $database === 'ok' ? 'ok' : 'degraded',
                'database' => $database,
                'time' => date('c'),
            ],
            'message' => '',
        ];
    }
}
