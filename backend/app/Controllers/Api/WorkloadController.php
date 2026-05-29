<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\ProjectModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Workload overview per project member.
 *
 * GET /api/projects/:projectId/workload
 *
 * Returns array of:
 *   user_id, first_name, last_name, username, role,
 *   tasks_total, tasks_done, tasks_in_progress, tasks_pending, tasks_blocked,
 *   hours_estimated, hours_logged, recent_tasks[]
 */
class WorkloadController extends BaseController
{
    private ProjectModel $projectModel;

    public function __construct()
    {
        $this->projectModel = new ProjectModel();
    }

    public function index(int $projectId): ResponseInterface
    {
        if (!$this->projectModel->find($projectId)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Proyecto no encontrado']);
        }

        $db = Database::connect();

        // ── 1. Members ───────────────────────────────────────────────────────
        $members = $db->query("
            SELECT u.id AS user_id, u.first_name, u.last_name, u.username, pm.role
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = ?
            ORDER BY u.first_name, u.last_name
        ", [$projectId])->getResultArray();

        if (empty($members)) {
            return $this->response->setJSON([]);
        }

        $userIds    = array_column($members, 'user_id');
        $inClause   = implode(',', array_fill(0, count($userIds), '?'));

        // ── 2. Task counts via task_assignees (supports multi-assignee) ──────
        //    Uses real ENUM values: PENDIENTE, EN_PROGRESO, BLOQUEADA, COMPLETADA
        $taskRows = $db->query("
            SELECT
                ta.user_id,
                COUNT(DISTINCT t.id)                                              AS tasks_total,
                SUM(t.status = 'COMPLETADA')                                      AS tasks_done,
                SUM(t.status = 'EN_PROGRESO')                                     AS tasks_in_progress,
                SUM(t.status = 'PENDIENTE')                                       AS tasks_pending,
                SUM(t.status = 'BLOQUEADA')                                       AS tasks_blocked,
                COALESCE(SUM(t.estimated_hours), 0)                               AS hours_estimated
            FROM task_assignees ta
            JOIN tasks   t ON t.id   = ta.task_id   AND t.parent_task_id IS NULL
            JOIN sprints s ON s.id   = t.sprint_id
            WHERE s.project_id = ? AND ta.user_id IN ({$inClause})
            GROUP BY ta.user_id
        ", array_merge([$projectId], $userIds))->getResultArray();

        // ── 3. Logged hours from task_time_logs ──────────────────────────────
        $logRows = $db->query("
            SELECT
                ttl.user_id,
                COALESCE(SUM(ttl.hours), 0) AS hours_logged
            FROM task_time_logs ttl
            JOIN tasks   t ON t.id = ttl.task_id
            JOIN sprints s ON s.id = t.sprint_id
            WHERE s.project_id = ? AND ttl.user_id IN ({$inClause})
            GROUP BY ttl.user_id
        ", array_merge([$projectId], $userIds))->getResultArray();

        // ── 4. Last 3 active tasks per member ────────────────────────────────
        $recentRows = $db->query("
            SELECT
                ta.user_id,
                t.id, t.title, t.status, t.priority,
                t.due_date, t.estimated_hours,
                sp.name AS sprint_name
            FROM task_assignees ta
            JOIN tasks   t  ON t.id  = ta.task_id   AND t.parent_task_id IS NULL
            JOIN sprints sp ON sp.id = t.sprint_id
            WHERE sp.project_id = ?
              AND ta.user_id IN ({$inClause})
              AND t.status != 'COMPLETADA'
            ORDER BY ta.user_id,
                     FIELD(t.status,'EN_PROGRESO','BLOQUEADA','PENDIENTE'),
                     t.due_date IS NULL, t.due_date ASC
        ", array_merge([$projectId], $userIds))->getResultArray();

        // Index by user
        $tasksByUser  = array_column($taskRows,  null, 'user_id');
        $logsByUser   = array_column($logRows,   null, 'user_id');

        $recentByUser = [];
        foreach ($recentRows as $r) {
            $uid = (int)$r['user_id'];
            if (!isset($recentByUser[$uid])) $recentByUser[$uid] = [];
            if (count($recentByUser[$uid]) < 3) $recentByUser[$uid][] = $r;
        }

        // ── 5. Build result ──────────────────────────────────────────────────
        $result = [];
        foreach ($members as $member) {
            $uid    = (int)$member['user_id'];
            $stats  = $tasksByUser[$uid]  ?? [];
            $logs   = $logsByUser[$uid]   ?? [];

            $hoursEst    = (float)($stats['hours_estimated'] ?? 0);
            $hoursLogged = (float)($logs['hours_logged']     ?? 0);
            $tasksTotal  = (int)($stats['tasks_total']       ?? 0);
            $tasksDone   = (int)($stats['tasks_done']        ?? 0);

            $result[] = [
                'user_id'           => $uid,
                'first_name'        => $member['first_name'],
                'last_name'         => $member['last_name'],
                'username'          => $member['username'],
                'role'              => $member['role'],
                'tasks_total'       => $tasksTotal,
                'tasks_done'        => $tasksDone,
                'tasks_in_progress' => (int)($stats['tasks_in_progress'] ?? 0),
                'tasks_pending'     => (int)($stats['tasks_pending']     ?? 0),
                'tasks_blocked'     => (int)($stats['tasks_blocked']     ?? 0),
                'completion_pct'    => $tasksTotal > 0 ? round(($tasksDone / $tasksTotal) * 100) : 0,
                'hours_estimated'   => $hoursEst,
                'hours_logged'      => $hoursLogged,
                'over_budget'       => $hoursEst > 0 && $hoursLogged > $hoursEst,
                'recent_tasks'      => $recentByUser[$uid] ?? [],
            ];
        }

        // Sort: most tasks first
        usort($result, fn($a, $b) => $b['tasks_total'] - $a['tasks_total']);

        return $this->response->setJSON($result);
    }
}
