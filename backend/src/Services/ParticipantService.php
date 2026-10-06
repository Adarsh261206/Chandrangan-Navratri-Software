<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\ApiException;
use App\Core\AppConfig;
use App\Core\Database;

final class ParticipantService
{
    public function __construct(
        private readonly AppConfig $config,
        private readonly AgeGroupService $ageGroups
    ) {
    }

    /**
     * @return array{items: list<array<string, mixed>>, pagination: array<string, int>}
     */
    public function list(int $page, int $perPage, ?int $ageGroupId, ?int $prizePosition, ?int $dayId): array
    {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));

        $where = [];
        $params = [];
        if ($dayId !== null) {
            $where[] = 'p.day_id = ?';
            $params[] = $dayId;
        }
        if ($ageGroupId !== null) {
            $where[] = 'p.age_group_id = ?';
            $params[] = $ageGroupId;
        }
        if ($prizePosition !== null) {
            $where[] = 'p.prize_position = ?';
            $params[] = $prizePosition;
        }
        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $total = (int) Database::scalar(
            'SELECT COUNT(*) FROM participants p' . $whereSql,
            $params
        );

        $items = Database::all(
            'SELECT p.id, p.participant_code, p.name, p.day_id, p.age_group_id, p.prize_position,
                    p.photo_thumb_path, p.photo_path, p.created_at, g.name AS age_group_name,
                    d.label AS day_label, d.event_date AS day_date
             FROM participants p
             JOIN age_groups g ON g.id = p.age_group_id
             JOIN event_days d ON d.id = p.day_id'
            . $whereSql . '
             ORDER BY p.day_id ASC, p.created_at DESC, p.id DESC
             LIMIT ' . $perPage . ' OFFSET ' . (($page - 1) * $perPage),
            $params
        );

        return [
            'items' => array_map(fn (array $row): array => $this->shape($row), $items),
            'pagination' => $this->pagination($page, $perPage, $total),
        ];
    }

    /**
     * Server-side search by name, participant code or age group name.
     *
     * @return array{items: list<array<string, mixed>>, pagination: array<string, int>}
     */
    public function search(string $query, int $page, int $perPage, ?int $dayId = null): array
    {
        $normalized = NameNormalizer::search($query);
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));

        if ($normalized === '') {
            return [
                'items' => [],
                'pagination' => $this->pagination($page, $perPage, 0),
            ];
        }

        $like = '%' . self::escapeLike($normalized) . '%';
        $codeLike = '%' . self::escapeLike(strtoupper($query)) . '%';

        $where = '(p.normalized_name LIKE ? ESCAPE \'\\\\\'
                   OR UPPER(p.participant_code) LIKE ? ESCAPE \'\\\\\'
                   OR LOWER(g.name) LIKE ? ESCAPE \'\\\\\')';
        $params = [$like, $codeLike, $like];

        if ($dayId !== null) {
            $where .= ' AND p.day_id = ?';
            $params[] = $dayId;
        }

        $total = (int) Database::scalar(
            'SELECT COUNT(*) FROM participants p JOIN age_groups g ON g.id = p.age_group_id WHERE ' . $where,
            $params
        );

        $items = Database::all(
            'SELECT p.id, p.participant_code, p.name, p.day_id, p.age_group_id, p.prize_position,
                    p.photo_thumb_path, p.photo_path, p.created_at, g.name AS age_group_name,
                    d.label AS day_label, d.event_date AS day_date
             FROM participants p
             JOIN age_groups g ON g.id = p.age_group_id
             JOIN event_days d ON d.id = p.day_id
             WHERE ' . $where . '
             ORDER BY (p.participant_code = ?) DESC, (p.normalized_name = ?) DESC, p.day_id ASC, p.created_at DESC
             LIMIT ' . $perPage . ' OFFSET ' . (($page - 1) * $perPage),
            array_merge($params, [strtoupper($query), $normalized])
        );

        return [
            'items' => array_map(fn (array $row): array => $this->shape($row), $items),
            'pagination' => $this->pagination($page, $perPage, $total),
        ];
    }

    /** @return array<string, mixed> */
    public function find(int $id): array
    {
        $row = Database::one(
            'SELECT p.id, p.participant_code, p.name, p.normalized_name, p.day_id, p.age_group_id, p.prize_position,
                    p.photo_path, p.photo_thumb_path, p.photo_width, p.photo_height, p.created_at,
                    g.name AS age_group_name, g.is_active AS age_group_active,
                    d.label AS day_label, d.event_date AS day_date
             FROM participants p
             JOIN age_groups g ON g.id = p.age_group_id
             JOIN event_days d ON d.id = p.day_id
             WHERE p.id = ?',
            [$id]
        );
        if ($row === null) {
            throw ApiException::notFound('Participant not found.');
        }

        $history = Database::all(
            'SELECT p.id, p.participant_code, p.prize_position, p.created_at, p.day_id,
                    g.name AS age_group_name, d.label AS day_label
             FROM participants p
             JOIN age_groups g ON g.id = p.age_group_id
             JOIN event_days d ON d.id = p.day_id
             WHERE p.normalized_name = ?
             ORDER BY p.day_id ASC, p.created_at ASC, p.id ASC',
            [(string) $row['normalized_name']]
        );

        $data = $this->shape($row, true);
        $data['history'] = array_map(static fn (array $item): array => [
            'participant_id' => (int) $item['id'],
            'participant_code' => $item['participant_code'],
            'age_group_name' => $item['age_group_name'],
            'prize_position' => (int) $item['prize_position'],
            'day_id' => (int) $item['day_id'],
            'day_label' => $item['day_label'],
            'created_at' => $item['created_at'],
            'is_current' => (int) $item['id'] === $id,
        ], $history);

        // Other prize slots in the same day + group (move targets and blockers).
        $siblings = Database::all(
            'SELECT id, prize_position FROM participants
             WHERE day_id = ? AND age_group_id = ? AND id <> ?
             ORDER BY prize_position ASC',
            [(int) $row['day_id'], (int) $row['age_group_id'], $id]
        );
        $occupied = [];
        foreach ($siblings as $sibling) {
            $occupied[(int) $sibling['prize_position']] = (int) $sibling['id'];
        }
        $data['move_targets'] = array_values(array_filter(
            [1, 2, 3],
            static fn (int $p): bool => $p !== (int) $row['prize_position']
        ));
        $data['occupied_slots'] = $occupied;

        return $data;
    }

    /**
     * Duplicate detection across the three required cases.
     *
     * @return array{level: 'none'|'exact'|'group'|'other', matches: list<array<string, mixed>>}
     */
    public function findDuplicates(string $name, ?int $ageGroupId, ?int $prizePosition, ?int $dayId = null): array
    {
        $normalized = NameNormalizer::normalize($name);
        if ($normalized === '') {
            return ['level' => 'none', 'matches' => []];
        }

        $matches = Database::all(
            'SELECT p.id, p.participant_code, p.name, p.day_id, p.age_group_id, p.prize_position, p.created_at,
                    g.name AS age_group_name, d.label AS day_label, d.event_date AS day_date
             FROM participants p
             JOIN age_groups g ON g.id = p.age_group_id
             JOIN event_days d ON d.id = p.day_id
             WHERE p.normalized_name = ?
             ORDER BY p.day_id ASC, p.created_at DESC
             LIMIT 10',
            [$normalized]
        );

        if ($matches === []) {
            return ['level' => 'none', 'matches' => []];
        }

        $shaped = array_map(function (array $row): array {
            return [
                'participant_id' => (int) $row['id'],
                'participant_code' => $row['participant_code'],
                'name' => $row['name'],
                'day_id' => (int) $row['day_id'],
                'day_label' => $row['day_label'],
                'day_date' => $row['day_date'],
                'age_group_id' => (int) $row['age_group_id'],
                'age_group_name' => $row['age_group_name'],
                'prize_position' => (int) $row['prize_position'],
                'created_at' => $row['created_at'],
            ];
        }, $matches);

        // Levels are scoped to the target day:
        //   exact = same name + day + group + prize
        //   group = same name + day + same group, different prize
        //   other = different day (or a different group on this day)
        $level = 'other';
        if ($ageGroupId !== null && $dayId !== null) {
            $sameDay = array_filter($shaped, static fn (array $m): bool => (int) $m['day_id'] === $dayId);
            $sameGroup = array_filter($sameDay, static fn (array $m): bool => (int) $m['age_group_id'] === $ageGroupId);
            if ($sameGroup !== []) {
                if ($prizePosition !== null) {
                    $exact = array_filter($sameGroup, static fn (array $m): bool => (int) $m['prize_position'] === $prizePosition);
                    $level = $exact !== [] ? 'exact' : 'group';
                } else {
                    $level = 'group';
                }
            }
        }

        return ['level' => $level, 'matches' => $shaped];
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $files
     * @return array{participant: array<string, mixed>, duplicate: array<string, mixed>|null, idempotent: bool}
     */
    public function create(array $input, array $files, ?int $adminId): array
    {
        $name = trim(preg_replace('/\s+/u', ' ', (string) ($input['name'] ?? '')) ?? '');
        $ageGroupId = (int) ($input['age_group_id'] ?? 0);
        $prizePosition = (int) ($input['prize_position'] ?? 0);
        $dayId = (int) ($input['day_id'] ?? 0);
        $force = filter_var($input['force'] ?? false, FILTER_VALIDATE_BOOL);
        $requestId = trim((string) ($input['request_id'] ?? ''));

        // Idempotency: the same client request id never creates a second row.
        if ($requestId !== '') {
            $existingId = Database::scalar('SELECT id FROM participants WHERE request_id = ?', [$requestId]);
            if ($existingId !== null) {
                return [
                    'participant' => $this->find((int) $existingId),
                    'duplicate' => null,
                    'idempotent' => true,
                ];
            }
        }

        $day = (new EventDayService())->assertExists($dayId);
        $group = $this->ageGroups->assertActive($ageGroupId);

        $duplicates = $this->findDuplicates($name, $ageGroupId, $prizePosition, $dayId);
        if ($duplicates['level'] !== 'none' && !$force) {
            throw new ApiException(
                409,
                $this->duplicateMessage($duplicates['level'], $duplicates['matches'], $ageGroupId, $prizePosition, $dayId),
                'duplicate_' . $duplicates['level'],
                ['level' => $duplicates['level'], 'matches' => $duplicates['matches'], 'name' => $name]
            );
        }

        // One winner per slot: (day, age group, prize).
        $occupant = Database::one(
            'SELECT participant_code, name FROM participants
             WHERE day_id = ? AND age_group_id = ? AND prize_position = ? LIMIT 1',
            [$dayId, $ageGroupId, $prizePosition]
        );
        if ($occupant !== null) {
            throw new ApiException(
                409,
                $this->slotFullMessage($day, $group['name'], $occupant),
                'slot_full',
                ['occupant' => $occupant]
            );
        }

        $photo = null;
        $file = $files['photo'] ?? null;
        if (is_array($file) && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $photo = ImageService::storeParticipantPhoto($file, $this->config);
        }

        $normalized = NameNormalizer::normalize($name);

        $attempt = 0;
        while ($attempt < 3) {
            $attempt++;
            Database::begin();
            try {
                $code = $this->allocateCode();

                Database::run(
                    'INSERT INTO participants
                        (participant_code, name, normalized_name, day_id, age_group_id, prize_position,
                         photo_path, photo_thumb_path, photo_width, photo_height, request_id, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [
                        $code,
                        $name,
                        $normalized,
                        $dayId,
                        $ageGroupId,
                        $prizePosition,
                        $photo['path'] ?? null,
                        $photo['thumb'] ?? null,
                        $photo['width'] ?? null,
                        $photo['height'] ?? null,
                        $requestId !== '' ? $requestId : null,
                    ]
                );
                $id = Database::lastInsertId();
                Database::commit();

                AuditLogger::log($adminId, 'participant_created', 'participant', $id, [
                    'name' => $name,
                    'code' => $code,
                    'day' => $day['label'],
                    'age_group' => $group['name'],
                    'prize_position' => $prizePosition,
                    'forced' => $force && $duplicates['level'] !== 'none',
                ]);

                return [
                    'participant' => $this->find($id),
                    'duplicate' => $duplicates['level'] !== 'none' ? $duplicates : null,
                    'idempotent' => false,
                ];
            } catch (\PDOException $e) {
                Database::rollBack();

                // Race on request_id: another identical request won.
                if ($requestId !== '' && ((int) $e->getCode() === 23000) && str_contains($e->getMessage(), 'request_id')) {
                    $existingId = Database::scalar('SELECT id FROM participants WHERE request_id = ?', [$requestId]);
                    if ($existingId !== null) {
                        return [
                            'participant' => $this->find((int) $existingId),
                            'duplicate' => null,
                            'idempotent' => true,
                        ];
                    }
                }

                // Race: someone else claimed this (day, group, prize) slot first.
                if (((int) $e->getCode()) === 23000 && str_contains($e->getMessage(), 'uq_participants_day_group_prize')) {
                    if ($photo !== null) {
                        ImageService::delete($photo['path'], $this->config);
                        ImageService::delete($photo['thumb'], $this->config);
                    }
                    $taken = Database::one(
                        'SELECT participant_code, name FROM participants
                         WHERE day_id = ? AND age_group_id = ? AND prize_position = ? LIMIT 1',
                        [$dayId, $ageGroupId, $prizePosition]
                    );
                    throw new ApiException(
                        409,
                        $this->slotFullMessage($day, $group['name'], $taken ?? []),
                        'slot_full',
                        ['occupant' => $taken]
                    );
                }

                if ($attempt >= 3) {
                    if ($photo !== null) {
                        ImageService::delete($photo['path'], $this->config);
                        ImageService::delete($photo['thumb'], $this->config);
                    }
                    if (((int) $e->getCode()) === 23000 && str_contains($e->getMessage(), 'participant_code')) {
                        continue;
                    }
                    throw ApiException::server('Could not save the participant. Please try again.');
                }
            } catch (\Throwable $e) {
                Database::rollBack();
                if ($photo !== null) {
                    ImageService::delete($photo['path'], $this->config);
                    ImageService::delete($photo['thumb'], $this->config);
                }
                throw $e;
            }
        }

        throw ApiException::server('Could not save the participant. Please try again.');
    }

    public function delete(int $id, ?int $adminId): void
    {
        $row = Database::one(
            'SELECT id, name, participant_code, photo_path, photo_thumb_path FROM participants WHERE id = ?',
            [$id]
        );
        if ($row === null) {
            throw ApiException::notFound('Participant not found.');
        }

        Database::run('DELETE FROM participants WHERE id = ?', [$id]);

        ImageService::delete($row['photo_path'] !== null ? (string) $row['photo_path'] : null, $this->config);
        ImageService::delete($row['photo_thumb_path'] !== null ? (string) $row['photo_thumb_path'] : null, $this->config);

        AuditLogger::log($adminId, 'participant_deleted', 'participant', $id, [
            'name' => $row['name'],
            'code' => $row['participant_code'],
        ]);
    }

    /**
     * Move a winner to another prize slot within the same day + age group.
     *
     * Empty target  -> simple move.
     * Occupied      -> swap the two winners' prize positions.
     *
     * @return array{participant: array<string, mixed>, swapped_with: array<string, mixed>|null}
     */
    public function move(int $id, int $targetPrize, ?int $adminId): array
    {
        if (!in_array($targetPrize, [1, 2, 3], true)) {
            throw ApiException::validation(['prize_position' => 'Choose 1st, 2nd or 3rd prize.']);
        }

        Database::begin();
        try {
            $row = Database::one(
                'SELECT id, participant_code, name, day_id, age_group_id, prize_position
                 FROM participants WHERE id = ? FOR UPDATE',
                [$id]
            );
            if ($row === null) {
                Database::rollBack();
                throw ApiException::notFound('Participant not found.');
            }

            $currentPrize = (int) $row['prize_position'];
            if ($currentPrize === $targetPrize) {
                Database::rollBack();
                return ['participant' => $this->find($id), 'swapped_with' => null];
            }

            $group = $this->ageGroups->assertActive((int) $row['age_group_id']);
            $day = (new EventDayService())->assertExists((int) $row['day_id']);

            $other = Database::one(
                'SELECT id, participant_code, name, prize_position
                 FROM participants
                 WHERE day_id = ? AND age_group_id = ? AND prize_position = ? AND id <> ?
                 FOR UPDATE',
                [(int) $row['day_id'], (int) $row['age_group_id'], $targetPrize, $id]
            );

            if ($other !== null) {
                // Swap: park our row on a temp position, move the other, then land.
                Database::run('UPDATE participants SET prize_position = 9 WHERE id = ?', [$id]);
                Database::run('UPDATE participants SET prize_position = ? WHERE id = ?', [$currentPrize, (int) $other['id']]);
            }
            Database::run('UPDATE participants SET prize_position = ?, updated_at = NOW() WHERE id = ?', [$targetPrize, $id]);
            Database::commit();
        } catch (ApiException $e) {
            Database::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            Database::rollBack();
            throw ApiException::server('Could not move this winner. Please try again.');
        }

        AuditLogger::log($adminId, 'participant_moved', 'participant', $id, [
            'name' => $row['name'],
            'code' => $row['participant_code'],
            'day' => $day['label'],
            'age_group' => $group['name'],
            'from' => $currentPrize,
            'to' => $targetPrize,
            'swapped' => $other !== null,
        ]);

        return [
            'participant' => $this->find($id),
            'swapped_with' => $other !== null ? [
                'participant_id' => (int) $other['id'],
                'name' => $other['name'],
                'prize_position' => $currentPrize,
            ] : null,
        ];
    }

    private function allocateCode(): string
    {
        $exists = Database::scalar('SELECT value FROM counters WHERE name = ?', ['participant']);
        if ($exists === null) {
            Database::run(
                'INSERT INTO counters (name, value, updated_at) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE value = value',
                ['participant']
            );
            $value = 1;
        } else {
            Database::run('UPDATE counters SET value = value + 1, updated_at = NOW() WHERE name = ?', ['participant']);
            $value = (int) Database::scalar('SELECT value FROM counters WHERE name = ?', ['participant']);
        }

        return sprintf('NAV-%04d', $value);
    }

    /** @param list<array<string, mixed>> $matches */
    private function duplicateMessage(string $level, array $matches, int $ageGroupId, int $prizePosition, ?int $dayId = null): string
    {
        if ($matches === []) {
            return 'A participant with this name already exists.';
        }

        // Reference the record that actually conflicts with the requested slot.
        $match = $matches[0];
        foreach ($matches as $candidate) {
            $sameDay = $dayId === null || (int) $candidate['day_id'] === $dayId;
            $sameGroup = (int) $candidate['age_group_id'] === $ageGroupId;
            $samePrize = (int) $candidate['prize_position'] === $prizePosition;
            if (($level === 'exact' && $sameDay && $sameGroup && $samePrize)
                || ($level === 'group' && $sameDay && $sameGroup)
                || ($level === 'other' && (!$sameDay || !$sameGroup))
            ) {
                $match = $candidate;
                break;
            }
        }

        $destination = $match['age_group_name'] . ' → ' . $this->prizeLabel((int) $match['prize_position']);
        if ($dayId !== null && (int) $match['day_id'] !== $dayId) {
            $destination = $match['day_label'] . ', ' . $destination;
        }
        $displayName = (string) $match['name'];

        return match ($level) {
            'exact' => $displayName . ' is already registered in ' . $destination . '.',
            'group' => $displayName . ' is already registered in ' . $destination . ' (a different prize).',
            default => $displayName . ' was previously registered in ' . $destination . '.',
        };
    }

    /** @param array<string, mixed> $day @param array<string, mixed>|null $occupant */
    private function slotFullMessage(array $day, string $groupName, ?array $occupant): string
    {
        return sprintf(
            '%s · %s already has a winner: %s (%s). Remove that name first to add someone else.',
            $day['label'],
            $groupName,
            $occupant['name'] ?? '',
            $occupant['participant_code'] ?? ''
        );
    }

    private function prizeLabel(int $position): string
    {
        return match ($position) {
            1 => '1st Prize',
            2 => '2nd Prize',
            default => '3rd Prize',
        };
    }

    /** @param array<string, mixed> $row */
    private function shape(array $row, bool $full = false): array
    {
        $data = [
            'id' => (int) $row['id'],
            'participant_code' => $row['participant_code'],
            'name' => $row['name'],
            'day_id' => (int) ($row['day_id'] ?? 1),
            'day_label' => $row['day_label'] ?? null,
            'day_date' => $row['day_date'] ?? null,
            'age_group_id' => (int) $row['age_group_id'],
            'age_group_name' => $row['age_group_name'] ?? null,
            'prize_position' => (int) $row['prize_position'],
            'photo' => ImageService::publicUrl($row['photo_path'] ?? null, $this->config),
            'photo_thumb' => ImageService::publicUrl($row['photo_thumb_path'] ?? null, $this->config),
            'created_at' => $row['created_at'] ?? null,
        ];

        if ($full) {
            $data['photo_width'] = isset($row['photo_width']) && $row['photo_width'] !== null ? (int) $row['photo_width'] : null;
            $data['photo_height'] = isset($row['photo_height']) && $row['photo_height'] !== null ? (int) $row['photo_height'] : null;
        }

        return $data;
    }

    /** @return array<string, int> */
    private function pagination(int $page, int $perPage, int $total): array
    {
        return [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => max(1, (int) ceil($total / $perPage)),
        ];
    }

    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
