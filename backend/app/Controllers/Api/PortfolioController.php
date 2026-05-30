<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Portfolio — cross-project executive view.
 *
 * GET /api/portfolio
 */
class PortfolioController extends BaseController
{
    public function index(): ResponseInterface
    {
        $db    = Database::connect();
        $uid   = Auth::id();
        $role  = Auth::user()['role'] ?? '';
        $isAdmin = in_array($role, ['ADMIN', 'MANAGER']);

        // Projects accessible to this user
        $projectIds = $isAdmin
            ? array_column($db->table('projects')->select('id')->where('is_active', 1)->get()->getResultArray(), 'id')
            : array_column($db->query("
                SELECT DISTINCT p.id FROM projects p
                LEFT JOIN project_members pm ON pm.project_id = p.id
                WHERE p.is_active = 1 AND (p.director_id = ? OR pm.user_id = ?)
              ", [$uid, $uid])->getResultArray(), 'id');

        if (empty($projectIds)) return $this->response->setJSON([]);

        $inClause = implode(',', $projectIds);

        $rows = $db->query("
            SELECT
                p.id, p.name, p.code, p.status,
                p.planned_start_date, p.planned_end_date,
                p.planned_budget, p.actual_budget, p.hourly_rate,
                CONCAT(u.first_name,' ',u.last_name) AS director_name,

                /* Task stats */
                COUNT(DISTINCT t.id)                          AS tasks_total,
                SUM(t.status = 'COMPLETADA')                  AS tasks_done,
                SUM(t.status = 'BLOQUEADA')                   AS tasks_blocked,
                SUM(t.status = 'EN_PROGRESO')                 AS tasks_in_progress,
                SUM(t.due_date < CURDATE() AND t.status != 'COMPLETADA') AS tasks_overdue,

                /* Active sprint */
                (SELECT s2.name FROM sprints s2
                 WHERE s2.project_id = p.id AND s2.status = 'ACTIVO'
                 LIMIT 1)                                     AS active_sprint,

                /* Risk count */
                (SELECT COUNT(*) FROM risks r
                 WHERE r.project_id = p.id AND r.status = 'ACTIVO'
                   AND r.probability = 'ALTA' AND r.impact = 'ALTO') AS critical_risks,

                /* Overdue milestones */
                (SELECT COUNT(*) FROM milestones m
                 WHERE m.project_id = p.id AND m.is_completed = 0
                   AND m.due_date < CURDATE())                AS overdue_milestones,

                /* Members */
                (SELECT COUNT(DISTINCT pm2.user_id) FROM project_members pm2
                 WHERE pm2.project_id = p.id)                 AS member_count,

                /* Logged hours */
                (SELECT COALESCE(SUM(ttl.hours),0)
                 FROM task_time_logs ttl
                 JOIN tasks t2 ON t2.id = ttl.task_id
                 JOIN sprints sp2 ON sp2.id = t2.sprint_id
                 WHERE sp2.project_id = p.id)                 AS hours_logged

            FROM projects p
            LEFT JOIN users u   ON u.id = p.director_id
            LEFT JOIN sprints s ON s.project_id = p.id
            LEFT JOIN tasks t   ON t.sprint_id  = s.id AND t.parent_task_id IS NULL
            WHERE p.id IN ({$inClause})
            GROUP BY p.id
            ORDER BY p.status, p.name
        ")->getResultArray();

        // Compute derived fields
        foreach ($rows as &$row) {
            $total  = (int)$row['tasks_total'];
            $done   = (int)$row['tasks_done'];
            $row['completion_pct'] = $total > 0 ? round(($done / $total) * 100) : 0;

            // RAG status
            $critRisks = (int)$row['critical_risks'];
            $overdue   = (int)$row['tasks_overdue'];
            $row['rag'] = $critRisks > 0 || $overdue > 3       ? 'RED'
                        : ($critRisks > 0 || $overdue > 0)     ? 'AMBER'
                        : 'GREEN';

            // Budget utilization
            $planned = (float)$row['planned_budget'];
            $actual  = (float)$row['actual_budget'];
            $hourly  = (float)$row['hourly_rate'];
            $logged  = (float)$row['hours_logged'];
            $computedCost = $hourly > 0 ? $hourly * $logged : 0;
            $row['budget_pct'] = $planned > 0
                ? min(150, round((($actual ?: $computedCost) / $planned) * 100))
                : null;

            // Days left
            if ($row['planned_end_date']) {
                $row['days_left'] = (int)ceil((strtotime($row['planned_end_date']) - time()) / 86400);
            } else {
                $row['days_left'] = null;
            }
        }

        return $this->response->setJSON($rows);
    }
}
