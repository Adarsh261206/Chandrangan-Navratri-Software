<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Core\Auth;
use App\Core\Request;
use App\Core\Validator;
use App\Services\AuthService;

final class AuthController
{
    public static function login(Request $request, AppConfig $config): array
    {
        $input = Validator::check($request->body, [
            'username' => 'required|string|max_len:60',
            'password' => 'required|string|max_len:200',
        ]);

        $service = new AuthService($config);
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

        $result = $service->login((string) $input['username'], (string) $input['password'], $ip);

        return ['data' => $result, 'message' => 'Signed in successfully.'];
    }

    public static function logout(AppConfig $config): array
    {
        (new AuthService($config))->logout();
        return ['data' => null, 'message' => 'Signed out.'];
    }

    public static function me(AppConfig $config): array
    {
        $result = (new AuthService($config))->me();
        return ['data' => $result, 'message' => ''];
    }

    public static function changePassword(Request $request, AppConfig $config): array
    {
        $input = Validator::check($request->body, [
            'current_password' => 'required|string|max_len:200',
            'new_password' => 'required|string|max_len:200',
        ]);

        $user = Auth::require();
        (new AuthService($config))->changePassword(
            $user,
            (string) $input['current_password'],
            (string) $input['new_password']
        );

        return ['data' => null, 'message' => 'Password updated.'];
    }
}
