<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Core\Auth;
use App\Core\Request;
use App\Services\EventDayService;

final class EventDayController
{
    public static function index(AppConfig $config): array
    {
        $result = (new EventDayService())->list();
        return ['data' => $result, 'message' => ''];
    }

    public static function update(Request $request, AppConfig $config): array
    {
        $dates = [];
        $body = $request->body;
        if (is_array($body['days'] ?? null)) {
            foreach ($body['days'] as $id => $date) {
                $dates[(int) $id] = $date;
            }
        }

        $admin = Auth::user();
        $result = (new EventDayService())->updateDates(
            $dates,
            is_array($admin) ? (int) $admin['id'] : null
        );

        return ['data' => $result, 'message' => 'Event days updated.'];
    }
}
