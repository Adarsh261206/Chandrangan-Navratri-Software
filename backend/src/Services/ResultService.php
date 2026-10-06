<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\AppConfig;
use App\Core\Database;

final class ResultService
{
    public function __construct(private readonly AppConfig $config)
    {
    }

    /**
     * Public results payload. Only exposes display-safe fields.
     *
     * @return array{age_groups: list<array<string, mixed>>}
     */
    public function publicResults(?int $ageGroupId, ?int $dayId): array
    {
        $days = (new EventDayService())->list();
        $selectedDay = $dayId ?? $days['today_id'] ?? 1;

        $groups = Database::all(
            'SELECT id, name FROM age_groups WHERE is_active = 1'
            . ($ageGroupId !== null ? ' AND id = ?' : '') . '
             ORDER BY sort_order ASC, id ASC',
            $ageGroupId !== null ? [$ageGroupId] : []
        );

        if ($groups === []) {
            return ['days' => $days['days'], 'selected_day' => $selectedDay, 'age_groups' => []];
        }

        $groupIds = array_map(static fn (array $g): int => (int) $g['id'], $groups);
        $placeholders = implode(',', array_fill(0, count($groupIds), '?'));

        $participants = Database::all(
            'SELECT p.name, p.prize_position, p.age_group_id, p.photo_path, p.photo_thumb_path, p.created_at
             FROM participants p
             WHERE p.day_id = ? AND p.age_group_id IN (' . $placeholders . ')
             ORDER BY p.prize_position ASC, p.created_at ASC, p.id ASC',
            array_merge([$selectedDay], $groupIds)
        );

        $bucketed = [];
        foreach ($participants as $row) {
            $bucketed[(int) $row['age_group_id']][] = [
                'name' => $row['name'],
                'prize_position' => (int) $row['prize_position'],
                'photo' => ImageService::publicUrl($row['photo_path'] ?? null, $this->config),
                'photo_thumb' => ImageService::publicUrl($row['photo_thumb_path'] ?? null, $this->config),
                'registered_on' => date('Y-m-d', strtotime((string) $row['created_at'])),
            ];
        }

        $result = [];
        foreach ($groups as $group) {
            $id = (int) $group['id'];
            $rows = $bucketed[$id] ?? [];
            $prizes = ['1' => [], '2' => [], '3' => []];
            foreach ($rows as $row) {
                $position = (string) $row['prize_position'];
                if (isset($prizes[$position])) {
                    $prizes[$position][] = [
                        'name' => $row['name'],
                        'photo' => $row['photo'],
                        'photo_thumb' => $row['photo_thumb'],
                        'registered_on' => $row['registered_on'],
                    ];
                }
            }

            $result[] = [
                'id' => $id,
                'name' => $group['name'],
                'prizes' => $prizes,
                'total' => count($rows),
            ];
        }

        return [
            'days' => $days['days'],
            'selected_day' => $selectedDay,
            'age_groups' => $result,
        ];
    }
}
