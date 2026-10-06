<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\ApiException;
use App\Core\Database;

final class AgeGroupService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function list(bool $withCounts = true): array
    {
        if (!$withCounts) {
            return Database::all(
                'SELECT id, name, description, is_active, sort_order, created_at
                 FROM age_groups ORDER BY sort_order ASC, id ASC'
            );
        }

        $groups = Database::all(
            'SELECT id, name, description, is_active, sort_order, created_at
             FROM age_groups ORDER BY sort_order ASC, id ASC'
        );

        $counts = Database::all(
            'SELECT age_group_id, prize_position, COUNT(*) AS total
             FROM participants GROUP BY age_group_id, prize_position'
        );

        $index = [];
        foreach ($counts as $count) {
            $index[(int) $count['age_group_id']][(int) $count['prize_position']] = (int) $count['total'];
        }

        return array_map(static function (array $group) use ($index): array {
            $id = (int) $group['id'];
            $byPrize = $index[$id] ?? [];
            $total = array_sum($byPrize);
            return [
                'id' => $id,
                'name' => $group['name'],
                'description' => $group['description'],
                'is_active' => (bool) $group['is_active'],
                'sort_order' => (int) $group['sort_order'],
                'created_at' => $group['created_at'],
                'counts' => [
                    '1' => $byPrize[1] ?? 0,
                    '2' => $byPrize[2] ?? 0,
                    '3' => $byPrize[3] ?? 0,
                ],
                'total' => $total,
            ];
        }, $groups);
    }

    public function find(int $id): array
    {
        $group = Database::one(
            'SELECT id, name, description, is_active, sort_order, created_at
             FROM age_groups WHERE id = ?',
            [$id]
        );
        if ($group === null) {
            throw ApiException::notFound('Age group not found.');
        }

        $counts = Database::all(
            'SELECT prize_position, COUNT(*) AS total FROM participants WHERE age_group_id = ? GROUP BY prize_position',
            [$id]
        );

        $byPrize = [];
        foreach ($counts as $count) {
            $byPrize[(int) $count['prize_position']] = (int) $count['total'];
        }

        return [
            'id' => (int) $group['id'],
            'name' => $group['name'],
            'description' => $group['description'],
            'is_active' => (bool) $group['is_active'],
            'sort_order' => (int) $group['sort_order'],
            'created_at' => $group['created_at'],
            'counts' => [
                '1' => $byPrize[1] ?? 0,
                '2' => $byPrize[2] ?? 0,
                '3' => $byPrize[3] ?? 0,
            ],
            'total' => array_sum($byPrize),
        ];
    }

    public function create(array $input, ?int $adminId): array
    {
        $name = $this->uniqueName($input['name']);
        $description = trim((string) ($input['description'] ?? ''));
        $isActive = isset($input['is_active']) ? (int) (bool) $input['is_active'] : 1;

        $nextOrder = (int) Database::scalar(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 FROM age_groups'
        );

        Database::run(
            'INSERT INTO age_groups (name, description, is_active, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())',
            [$name, $description, $isActive, $nextOrder]
        );
        $id = Database::lastInsertId();

        AuditLogger::log($adminId, 'age_group_created', 'age_group', $id, ['name' => $name]);

        return $this->find($id);
    }

    public function update(int $id, array $input, ?int $adminId): array
    {
        $existing = $this->find($id);

        $name = isset($input['name']) ? $this->uniqueName((string) $input['name'], $id) : $existing['name'];
        $description = array_key_exists('description', $input)
            ? trim((string) $input['description'])
            : (string) $existing['description'];
        $isActive = array_key_exists('is_active', $input)
            ? (int) (bool) $input['is_active']
            : (int) $existing['is_active'];

        Database::run(
            'UPDATE age_groups SET name = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
            [$name, $description, $isActive, $id]
        );

        AuditLogger::log($adminId, 'age_group_updated', 'age_group', $id, [
            'name' => $name,
            'is_active' => $isActive,
        ]);

        return $this->find($id);
    }

    public function delete(int $id, ?int $adminId): void
    {
        $group = $this->find($id);
        $participants = (int) Database::scalar(
            'SELECT COUNT(*) FROM participants WHERE age_group_id = ?',
            [$id]
        );

        if ($participants > 0) {
            throw ApiException::conflict(
                $participants . ' participant(s) are registered in "' . $group['name'] . '". Remove or move them before deleting this age group.',
                'age_group_in_use',
                ['participants' => $participants]
            );
        }

        Database::run('DELETE FROM age_groups WHERE id = ?', [$id]);
        AuditLogger::log($adminId, 'age_group_deleted', 'age_group', $id, ['name' => $group['name']]);
    }

    /**
     * @param list<int> $orderedIds
     */
    public function reorder(array $orderedIds, ?int $adminId): void
    {
        if ($orderedIds === []) {
            throw ApiException::validation(['ids' => 'No age groups supplied.']);
        }

        Database::begin();
        try {
            $position = 1;
            foreach ($orderedIds as $id) {
                Database::run(
                    'UPDATE age_groups SET sort_order = ?, updated_at = NOW() WHERE id = ?',
                    [$position, (int) $id]
                );
                $position++;
            }
            Database::commit();
        } catch (\Throwable $e) {
            Database::rollBack();
            throw $e;
        }

        AuditLogger::log($adminId, 'age_group_reordered', 'age_group', null, ['order' => $orderedIds]);
    }

    public function assertActive(int $id): array
    {
        $group = $this->find($id);
        if ((int) $group['is_active'] !== 1) {
            throw ApiException::validation(['age_group_id' => '"' . $group['name'] . '" is disabled. Enable it first.']);
        }
        return $group;
    }

    private function uniqueName(string $name, ?int $ignoreId = null): string
    {
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? $name);
        if ($name === '') {
            throw ApiException::validation(['name' => 'Age group name is required.']);
        }
        if (mb_strlen($name) > 60) {
            throw ApiException::validation(['name' => 'Age group name must be 60 characters or fewer.']);
        }

        $existing = Database::one(
            'SELECT id FROM age_groups WHERE LOWER(name) = ?' . ($ignoreId !== null ? ' AND id != ?' : '') . ' LIMIT 1',
            $ignoreId !== null ? [mb_strtolower($name), $ignoreId] : [mb_strtolower($name)]
        );

        if ($existing !== null) {
            throw ApiException::validation(['name' => 'An age group with this name already exists.']);
        }

        return $name;
    }
}
