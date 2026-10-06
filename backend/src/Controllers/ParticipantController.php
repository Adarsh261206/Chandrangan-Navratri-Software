<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AppConfig;
use App\Core\Auth;
use App\Core\Request;
use App\Core\Validator;
use App\Services\ParticipantService;

final class ParticipantController
{
    private static function service(AppConfig $config): ParticipantService
    {
        return new ParticipantService($config, new \App\Services\AgeGroupService());
    }

    public static function index(Request $request, AppConfig $config): array
    {
        $ageGroupId = $request->intParam('age_group_id', 0);
        $prizePosition = $request->intParam('prize_position', 0);
        $page = $request->intParam('page', 1);
        $perPage = $request->intParam('per_page', 20);

        $result = self::service($config)->list(
            $page,
            $perPage,
            $ageGroupId > 0 ? $ageGroupId : null,
            in_array($prizePosition, [1, 2, 3], true) ? $prizePosition : null
        );

        return ['data' => $result, 'message' => ''];
    }

    public static function search(Request $request, AppConfig $config): array
    {
        $query = $request->stringParam('q');
        $result = self::service($config)->search($query, $request->intParam('page', 1), $request->intParam('per_page', 20));

        return ['data' => $result, 'message' => ''];
    }

    public static function checkDuplicate(Request $request, AppConfig $config): array
    {
        $input = Validator::check($request->query, [
            'name' => 'required|string|trim|max_len:120',
            'age_group_id' => 'sometimes|int|min:1',
            'prize_position' => 'sometimes|int|in:1,2,3',
        ]);

        $result = self::service($config)->findDuplicates(
            (string) $input['name'],
            isset($input['age_group_id']) ? (int) $input['age_group_id'] : null,
            isset($input['prize_position']) ? (int) $input['prize_position'] : null
        );

        return ['data' => $result, 'message' => ''];
    }

    public static function store(Request $request, AppConfig $config): array
    {
        $input = Validator::check($request->body, [
            'name' => 'required|string|trim|min_len:2|max_len:120',
            'age_group_id' => 'required|int|min:1',
            'prize_position' => 'required|int|in:1,2,3',
            'request_id' => 'sometimes|string|trim|max_len:64',
            'force' => 'sometimes|string',
        ]);

        $input['force'] = $request->body['force'] ?? false;
        $input['request_id'] = $request->body['request_id'] ?? '';
        $input['name'] = (string) $input['name'];

        $admin = Auth::user();
        $result = self::service($config)->create(
            $input,
            $request->files,
            is_array($admin) ? (int) $admin['id'] : null
        );

        $message = $result['idempotent']
            ? 'Participant was already saved.'
            : 'Participant added successfully.';

        return [
            'data' => $result,
            'message' => $message,
        ];
    }

    public static function show(Request $request, array $params, AppConfig $config): array
    {
        $id = (int) ($params['id'] ?? 0);
        return ['data' => self::service($config)->find($id), 'message' => ''];
    }

    public static function destroy(Request $request, array $params, AppConfig $config): array
    {
        $id = (int) ($params['id'] ?? 0);
        $admin = Auth::user();

        self::service($config)->delete($id, is_array($admin) ? (int) $admin['id'] : null);

        return ['data' => null, 'message' => 'Participant removed.'];
    }
}
