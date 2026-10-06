<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

final class AuditLogger
{
    public static function log(?int $adminId, string $action, string $entityType, ?int $entityId, array $metadata = []): void
    {
        try {
            Database::run(
                'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, metadata, ip_address, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [
                    $adminId,
                    $action,
                    $entityType,
                    $entityId,
                    json_encode($metadata, JSON_UNESCAPED_UNICODE),
                    self::ip(),
                ]
            );
        } catch (\Throwable $e) {
            error_log('Audit log failed: ' . $e->getMessage());
        }
    }

    private static function ip(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        return substr((string) $ip, 0, 45);
    }
}
