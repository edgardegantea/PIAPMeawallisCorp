<?php

namespace App\Libraries;

use App\Models\ActivityLogModel;

/**
 * Static helper to write audit trail entries without coupling callers
 * tightly to the DB layer. Silently swallows any exception to ensure
 * existing functionality is never broken by a logging failure.
 */
class ActivityLogger
{
    public static function log(
        int    $projectId,
        string $action,
        ?string $entityType = null,
        ?int    $entityId   = null,
        ?string $description = null
    ): void {
        try {
            $model = new ActivityLogModel();
            $model->insert([
                'project_id'  => $projectId,
                'user_id'     => Auth::id(),
                'action'      => $action,
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'description' => $description,
            ]);
        } catch (\Throwable $e) {
            // Never let logging break request processing
            log_message('error', 'ActivityLogger::log failed: ' . $e->getMessage());
        }
    }
}
