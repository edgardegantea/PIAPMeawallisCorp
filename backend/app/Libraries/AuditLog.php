<?php

namespace App\Libraries;

use Config\Database;

/**
 * Lightweight helper to record audit log entries.
 * Usage: AuditLog::record('task', 5, 'status_changed', 'Estado cambiado a COMPLETADA', $old, $new);
 */
class AuditLog
{
    public static function record(
        string  $entityType,
        ?int    $entityId,
        string  $action,
        ?string $description = null,
        mixed   $oldValue    = null,
        mixed   $newValue    = null
    ): void {
        try {
            $db     = Database::connect();
            $userId = Auth::id();

            $db->table('audit_logs')->insert([
                'user_id'     => $userId,
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'action'      => $action,
                'description' => $description,
                'old_value'   => $oldValue  !== null ? json_encode($oldValue)  : null,
                'new_value'   => $newValue  !== null ? json_encode($newValue)  : null,
                'ip_address'  => service('request')->getIPAddress(),
                'created_at'  => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            // Never let audit failure break the main request
            log_message('error', 'AuditLog::record failed: ' . $e->getMessage());
        }
    }
}
