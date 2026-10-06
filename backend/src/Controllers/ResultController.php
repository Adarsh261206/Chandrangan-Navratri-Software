<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Core\Request;
use App\Services\ResultService;

final class ResultController
{
    public static function index(Request $request, AppConfig $config): array
    {
        $ageGroupId = $request->intParam('age_group_id', 0);

        return [
            'data' => (new ResultService($config))->publicResults($ageGroupId > 0 ? $ageGroupId : null),
            'message' => '',
        ];
    }
}
