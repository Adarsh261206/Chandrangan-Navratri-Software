<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Services\DashboardService;

final class DashboardController
{
    public static function stats(AppConfig $config): array
    {
        return ['data' => (new DashboardService($config))->stats(), 'message' => ''];
    }
}
