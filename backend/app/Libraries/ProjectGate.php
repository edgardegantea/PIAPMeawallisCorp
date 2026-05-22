<?php

namespace App\Libraries;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * Centralises write-permission checks for project-scoped resources.
 *
 * Who can write?
 *   - System role ADMIN  → always
 *   - System role DIRECTOR → always
 *   - The project's director_id user → always
 *   - A project_member with role 'PM' → yes (admin can promote any member to PM
 *     to grant them creation rights within that project)
 *   - TEAM_MEMBER with no PM role → read-only by default
 */
class ProjectGate
{
    /**
     * Returns true when the current user may create / modify / delete
     * resources that belong to $projectId.
     */
    public static function canWrite(int $projectId): bool
    {
        $user   = Auth::user();
        $userId = Auth::id();

        if (in_array($user['role'], ['ADMIN', 'DIRECTOR'], true)) {
            return true;
        }

        $db  = \Config\Database::connect();
        $row = $db->query(
            'SELECT p.director_id, pm.role AS project_role
             FROM   projects p
             LEFT JOIN project_members pm
                    ON pm.project_id = p.id AND pm.user_id = ?
             WHERE  p.id = ?',
            [$userId, $projectId]
        )->getRowArray();

        if (!$row) {
            return false;
        }

        return (int) $row['director_id'] === $userId
            || $row['project_role'] === 'PM';
    }

    /** Resolve the project_id that owns a given sprint. */
    public static function projectIdFromSprint(int $sprintId): ?int
    {
        $row = \Config\Database::connect()
            ->table('sprints')
            ->select('project_id')
            ->where('id', $sprintId)
            ->get()
            ->getRowArray();

        return $row ? (int) $row['project_id'] : null;
    }

    /** Resolve the project_id that owns a given task (via its sprint). */
    public static function projectIdFromTask(int $taskId): ?int
    {
        $row = \Config\Database::connect()->query(
            'SELECT s.project_id
             FROM   tasks t
             JOIN   sprints s ON s.id = t.sprint_id
             WHERE  t.id = ?',
            [$taskId]
        )->getRowArray();

        return $row ? (int) $row['project_id'] : null;
    }

    /** Standard 403 shortcut. */
    public static function deny($response): ResponseInterface
    {
        return $response
            ->setStatusCode(403)
            ->setJSON(['message' => 'No tienes permisos para esta acción']);
    }
}
