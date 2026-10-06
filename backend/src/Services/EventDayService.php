<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\ApiException;
use App\Core\Database;

final class EventDayService
{
    /**
     * All nine Navratri days with today's marker.
     *
     * @return array{days: list<array<string, mixed>>, today_id: int|null}
     */
    public function list(): array
    {
        $rows = Database::all(
            'SELECT id, label, event_date, is_active FROM event_days ORDER BY id ASC'
        );

        $today = date('Y-m-d');
        $days = [];
        $todayId = null;
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            $isToday = $row['event_date'] === $today;
            if ($isToday) {
                $todayId = $id;
            }
            $days[] = [
                'id' => $id,
                'label' => (string) $row['label'],
                'date' => (string) $row['event_date'],
                'weekday' => date('D', strtotime((string) $row['event_date'])),
                'is_active' => (bool) $row['is_active'],
                'is_today' => $isToday,
            ];
        }

        return ['days' => $days, 'today_id' => $todayId];
    }

    /**
     * Resolve the default day: today's event day, otherwise Day 1.
     */
    public function defaultDayId(): int
    {
        $listed = $this->list();
        return $listed['today_id'] ?? 1;
    }

    public function assertExists(int $dayId): array
    {
        $row = Database::one(
            'SELECT id, label, event_date, is_active FROM event_days WHERE id = ?',
            [$dayId]
        );
        if ($row === null) {
            throw ApiException::validation(['day_id' => 'Unknown event day.']);
        }
        return $row;
    }

    /**
     * Update the nine dates (Settings). Validates DATE values and uniqueness.
     *
     * @param array<int, mixed> $dates Map of day id (1..9) => 'YYYY-MM-DD'
     * @return array{days: list<array<string, mixed>>, today_id: int|null}
     */
    public function updateDates(array $dates, ?int $adminId): array
    {
        $clean = [];
        $errors = [];
        for ($id = 1; $id <= 9; $id++) {
            $value = trim((string) ($dates[$id] ?? ''));
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) || !strtotime($value)) {
                $errors['days.' . $id] = 'Use a valid date (YYYY-MM-DD).';
                continue;
            }
            $clean[$id] = $value;
        }
        if ($errors !== []) {
            throw ApiException::validation($errors);
        }
        $unique = array_unique($clean);
        if (count($unique) !== 9) {
            throw ApiException::validation(['days' => 'Each day needs its own date.']);
        }

        Database::begin();
        try {
            foreach ($clean as $id => $date) {
                Database::run(
                    'UPDATE event_days SET event_date = ?, updated_at = NOW() WHERE id = ?',
                    [$date, $id]
                );
            }
            Database::commit();
        } catch (\Throwable $e) {
            Database::rollBack();
            if (((int) $e->getCode()) === 23000) {
                throw ApiException::validation(['days' => 'Two days cannot share the same date.']);
            }
            throw $e;
        }

        AuditLogger::log($adminId, 'event_days_updated', 'event_day', null, ['dates' => $clean]);

        return $this->list();
    }
}
