<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\AppConfig;
use App\Core\Database;

final class DashboardService
{
    public function __construct(private readonly AppConfig $config)
    {
    }

    /** @return array<string, mixed> */
    public function stats(): array
    {
        $totals = Database::one(
            'SELECT COUNT(*) AS total,
                    COALESCE(SUM(CASE WHEN created_at >= CURDATE() THEN 1 ELSE 0 END), 0) AS today
             FROM participants'
        );

        $byPrize = Database::all(
            'SELECT prize_position, COUNT(*) AS total FROM participants GROUP BY prize_position'
        );

        $prizes = ['1' => 0, '2' => 0, '3' => 0];
        foreach ($byPrize as $row) {
            $position = (string) (int) $row['prize_position'];
            if (isset($prizes[$position])) {
                $prizes[$position] = (int) $row['total'];
            }
        }

        $ageGroupCount = (int) Database::scalar('SELECT COUNT(*) FROM age_groups WHERE is_active = 1');

        $ageGroups = Database::all(
            'SELECT id, name, is_active, sort_order FROM age_groups ORDER BY sort_order ASC, id ASC'
        );
        $counts = Database::all(
            'SELECT age_group_id, prize_position, COUNT(*) AS total
             FROM participants GROUP BY age_group_id, prize_position'
        );

        $countIndex = [];
        foreach ($counts as $row) {
            $countIndex[(int) $row['age_group_id']][(int) $row['prize_position']] = (int) $row['total'];
        }

        $groupCards = array_map(static function (array $group) use ($countIndex): array {
            $id = (int) $group['id'];
            $byPrizeCounts = $countIndex[$id] ?? [];
            return [
                'id' => $id,
                'name' => $group['name'],
                'is_active' => (bool) $group['is_active'],
                'counts' => [
                    '1' => $byPrizeCounts[1] ?? 0,
                    '2' => $byPrizeCounts[2] ?? 0,
                    '3' => $byPrizeCounts[3] ?? 0,
                ],
                'total' => array_sum($byPrizeCounts),
            ];
        }, $ageGroups);

        $recent = Database::all(
            'SELECT p.id, p.participant_code, p.name, p.prize_position, p.photo_thumb_path, p.created_at,
                    g.name AS age_group_name
             FROM participants p
             JOIN age_groups g ON g.id = p.age_group_id
             ORDER BY p.created_at DESC, p.id DESC
             LIMIT 5'
        );

        return [
            'total_participants' => (int) ($totals['total'] ?? 0),
            'today_registrations' => (int) ($totals['today'] ?? 0),
            'total_age_groups' => $ageGroupCount,
            'prizes' => $prizes,
            'age_groups' => $groupCards,
            'recent' => array_map(function (array $row): array {
                return [
                    'id' => (int) $row['id'],
                    'participant_code' => $row['participant_code'],
                    'name' => $row['name'],
                    'age_group_name' => $row['age_group_name'],
                    'prize_position' => (int) $row['prize_position'],
                    'photo_thumb' => ImageService::publicUrl($row['photo_thumb_path'] ?? null, $this->config),
                    'created_at' => $row['created_at'],
                ];
            }, $recent),
        ];
    }
}
