<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Core\Auth;
use App\Core\Request;
use App\Core\Validator;
use App\Services\AgeGroupService;

final class AgeGroupController
{
    public static function index(AppConfig $config): array
    {
        return ['data' => ['items' => (new AgeGroupService())->list()], 'message' => ''];
    }

    public static function show(array $params, AppConfig $config): array
    {
        $id = (int) ($params['id'] ?? 0);
        return ['data' => (new AgeGroupService())->find($id), 'message' => ''];
    }

    public static function store(Request $request, AppConfig $config): array
    {
        $input = Validator::check($request->body, [
            'name' => 'required|string|trim|max_len:60',
            'description' => 'sometimes|string|max_len:255',
            'is_active' => 'sometimes|int|in:0,1',
        ]);

        $id = self::adminId();
        $group = (new AgeGroupService())->create($input, $id);

        return ['data' => $group, 'message' => 'Age group created.'];
    }

    public static function update(Request $request, array $params, AppConfig $config): array
    {
        $id = (int) ($params['id'] ?? 0);
        $input = Validator::check($request->body, [
            'name' => 'sometimes|string|trim|max_len:60',
            'description' => 'sometimes|string|max_len:255',
            'is_active' => 'sometimes|int|in:0,1',
        ]);

        $group = (new AgeGroupService())->update($id, $input, self::adminId());

        return ['data' => $group, 'message' => 'Age group updated.'];
    }

    public static function destroy(Request $request, array $params, AppConfig $config): array
    {
        $id = (int) ($params['id'] ?? 0);
        (new AgeGroupService())->delete($id, self::adminId());

        return ['data' => null, 'message' => 'Age group deleted.'];
    }

    public static function reorder(Request $request, AppConfig $config): array
    {
        $ids = Validator::check($request->body, [
            'ids' => 'required',
        ]);

        $list = $ids['ids'] ?? [];
        if (!is_array($list)) {
            $list = [];
        }
        $list = array_values(array_filter(array_map('intval', $list), static fn (int $v): bool => $v > 0));

        (new AgeGroupService())->reorder($list, self::adminId());

        return ['data' => ['items' => (new AgeGroupService())->list()], 'message' => 'Order saved.'];
    }

    private static function adminId(): ?int
    {
        $user = Auth::user();
        return is_array($user) ? (int) $user['id'] : null;
    }
}
