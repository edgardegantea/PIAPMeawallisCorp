<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * GET /api/dashboard
 * Snapshot personal del usuario autenticado.
 */
class DashboardController extends BaseController
{
    public function index(): ResponseInterface
    {
        $db     = Database::connect();
        $userId = (int) Auth::id();
        $today  = date('Y-m-d');

        /* ── 1. Mis tareas activas ────────────────────────────────────────── */
        $allTasks = $db->query("
            SELECT t.id, t.title, t.status, t.priority, t.due_date,
                   t.estimated_hours, t.time_logged,
                   p.id   AS project_id,
                   p.name AS project_name,
                   p.code AS project_code
            FROM tasks t
            JOIN sprints  s ON s.id = t.sprint_id
            JOIN projects p ON p.id = s.project_id
            WHERE p.is_active = 1
              AND t.status != 'COMPLETADA'
              AND EXISTS (
                  SELECT 1 FROM task_assignees ta
                  WHERE ta.task_id = t.id AND ta.user_id = ?
              )
            ORDER BY
              CASE t.priority
                WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 ELSE 4
              END ASC,
              ISNULL(t.due_date) ASC,
              t.due_date ASC,
              t.id ASC
        ", [$userId])->getResultArray();

        $taskStats = ['total' => count($allTasks), 'pendiente' => 0, 'en_progreso' => 0, 'bloqueada' => 0, 'overdue' => 0];
        foreach ($allTasks as $t) {
            if ($t['status'] === 'PENDIENTE')  $taskStats['pendiente']++;
            if ($t['status'] === 'EN_PROGRESO') $taskStats['en_progreso']++;
            if ($t['status'] === 'BLOQUEADA')   $taskStats['bloqueada']++;
            if ($t['due_date'] && $t['due_date'] < $today) $taskStats['overdue']++;
        }
        $urgentTasks = array_slice($allTasks, 0, 8);

        /* ── 2. Mis proyectos activos ─────────────────────────────────────── */
        $myProjects = $db->query("
            SELECT p.id, p.code, p.name, p.status, p.completion_percentage,
                   p.planned_end_date,
                   c.name  AS category_name,
                   c.color AS category_color,
                   pm.role AS my_role
            FROM projects p
            LEFT JOIN project_categories c ON c.id = p.category_id
            LEFT JOIN project_members    pm ON pm.project_id = p.id AND pm.user_id = ?
            WHERE p.is_active = 1
              AND p.status NOT IN ('CIERRE','CANCELADO')
              AND (p.director_id = ? OR pm.user_id IS NOT NULL)
            ORDER BY p.planned_end_date ASC
            LIMIT 8
        ", [$userId, $userId])->getResultArray();

        /* ── 3. Horas registradas esta semana ─────────────────────────────── */
        $weekStart     = date('Y-m-d', strtotime('monday this week'));
        $hoursRow      = $db->query("
            SELECT COALESCE(SUM(hours), 0) AS total
            FROM task_time_logs
            WHERE user_id = ? AND work_date >= ?
        ", [$userId, $weekStart])->getRow();
        $hoursWeek     = $hoursRow ? (float) $hoursRow->total : 0.0;

        $completedRow  = $db->query("
            SELECT COUNT(*) AS cnt
            FROM tasks t
            WHERE t.status = 'COMPLETADA'
              AND t.updated_at >= ?
              AND EXISTS (
                  SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?
              )
        ", [$weekStart, $userId])->getRow();
        $completedWeek = $completedRow ? (int) $completedRow->cnt : 0;

        /* ── 4. Alertas ───────────────────────────────────────────────────── */
        $alerts = [];

        $overdueTasks = $db->query("
            SELECT t.id, t.title, t.due_date, s.project_id, p.name AS project_name
            FROM tasks t
            JOIN sprints  s ON s.id = t.sprint_id
            JOIN projects p ON p.id = s.project_id
            WHERE t.due_date < ?
              AND t.status != 'COMPLETADA'
              AND EXISTS (
                  SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?
              )
            ORDER BY t.due_date ASC
            LIMIT 3
        ", [$today, $userId])->getResultArray();
        foreach ($overdueTasks as $t) {
            $alerts[] = [
                'type'     => 'task_overdue',
                'severity' => 'warning',
                'title'    => 'Tarea vencida',
                'body'     => "{$t['title']} — {$t['project_name']}",
                'link'     => "/projects/{$t['project_id']}?tab=kanban",
            ];
        }

        $critRisks = $db->query("
            SELECT r.id, r.description, r.project_id, p.name AS project_name
            FROM risks r
            JOIN projects p ON p.id = r.project_id
            WHERE r.probability = 'ALTA'
              AND r.impact = 'ALTO'
              AND r.status = 'ACTIVO'
              AND p.is_active = 1
              AND (
                  p.director_id = ?
                  OR EXISTS (
                      SELECT 1 FROM project_members pm2
                      WHERE pm2.project_id = r.project_id AND pm2.user_id = ?
                  )
              )
            LIMIT 2
        ", [$userId, $userId])->getResultArray();
        foreach ($critRisks as $r) {
            $alerts[] = [
                'type'     => 'risk_critical',
                'severity' => 'error',
                'title'    => 'Riesgo crítico sin mitigar',
                'body'     => mb_substr($r['description'], 0, 70) . '… (' . $r['project_name'] . ')',
                'link'     => "/projects/{$r['project_id']}?tab=risks",
            ];
        }

        /* ── 5. Actividad reciente ────────────────────────────────────────── */
        $activity = $db->query("
            SELECT al.action, al.entity_type, al.description, al.created_at,
                   p.id   AS project_id,
                   p.name AS project_name,
                   p.code AS project_code,
                   u.first_name, u.last_name, u.username
            FROM activity_logs al
            JOIN  projects p  ON p.id = al.project_id
            LEFT JOIN users u ON u.id = al.user_id
            WHERE (
                p.director_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm3
                    WHERE pm3.project_id = al.project_id AND pm3.user_id = ?
                )
            )
            ORDER BY al.created_at DESC
            LIMIT 10
        ", [$userId, $userId])->getResultArray();

        /* ── 6. Horas por día (últimos 7 días) ─────────────────────────────── */
        $sevenDaysAgo = date('Y-m-d', strtotime('-6 days'));
        $rawHours = $db->query("
            SELECT DATE(work_date) AS day, COALESCE(SUM(hours), 0) AS hours
            FROM task_time_logs
            WHERE user_id = ? AND work_date >= ?
            GROUP BY day
            ORDER BY day
        ", [$userId, $sevenDaysAgo])->getResultArray();

        // Rellenar todos los días aunque no haya registros
        $hoursMap = [];
        foreach ($rawHours as $r) { $hoursMap[$r['day']] = (float) $r['hours']; }
        $hoursPerDay = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $hoursPerDay[] = [
                'date'    => $d,
                'label'   => date('D', strtotime($d)), // Mon, Tue…
                'hours'   => round($hoursMap[$d] ?? 0, 1),
            ];
        }

        /* ── 7. Distribución de tareas por prioridad ────────────────────────── */
        $rawPriority = $db->query("
            SELECT t.priority, COUNT(*) AS cnt
            FROM tasks t
            WHERE t.status != 'COMPLETADA'
              AND EXISTS (
                  SELECT 1 FROM task_assignees ta
                  WHERE ta.task_id = t.id AND ta.user_id = ?
              )
            GROUP BY t.priority
        ", [$userId])->getResultArray();
        $priorityDist = ['CRITICA' => 0, 'ALTA' => 0, 'MEDIA' => 0, 'BAJA' => 0];
        foreach ($rawPriority as $r) {
            if (isset($priorityDist[$r['priority']])) {
                $priorityDist[$r['priority']] = (int) $r['cnt'];
            }
        }

        /* ── 8. Avance por proyecto (activos del usuario) ───────────────────── */
        $projectProgress = $db->query("
            SELECT p.id, p.name, p.code,
                   COUNT(t.id)                                                     AS total,
                   SUM(CASE WHEN t.status = 'COMPLETADA' THEN 1 ELSE 0 END)       AS done,
                   SUM(CASE WHEN t.status = 'EN_PROGRESO' THEN 1 ELSE 0 END)      AS in_progress,
                   SUM(CASE WHEN t.status = 'BLOQUEADA' THEN 1 ELSE 0 END)        AS blocked,
                   ROUND(
                     SUM(CASE WHEN t.status = 'COMPLETADA' THEN 1 ELSE 0 END) * 100.0
                     / NULLIF(COUNT(t.id), 0), 0
                   )                                                                AS pct
            FROM projects p
            JOIN sprints  s ON s.project_id = p.id
            JOIN tasks    t ON t.sprint_id  = s.id
            WHERE p.is_active = 1
              AND (
                  p.director_id = ?
                  OR EXISTS (
                      SELECT 1 FROM project_members pm_p
                      WHERE pm_p.project_id = p.id AND pm_p.user_id = ?
                  )
              )
            GROUP BY p.id, p.name, p.code
            HAVING total > 0
            ORDER BY pct DESC
            LIMIT 8
        ", [$userId, $userId])->getResultArray();
        foreach ($projectProgress as &$pp) {
            $pp['total']       = (int) $pp['total'];
            $pp['done']        = (int) $pp['done'];
            $pp['in_progress'] = (int) $pp['in_progress'];
            $pp['blocked']     = (int) $pp['blocked'];
            $pp['pct']         = (int) ($pp['pct'] ?? 0);
        }
        unset($pp);

        /* ── 9. Estadísticas del equipo (solo para managers) ────────────────── */
        $authUser   = Auth::user();
        $isManager  = in_array($authUser['role'], ['ADMIN', 'DIRECTOR', 'PM']);
        $teamStats  = [];

        if ($isManager) {
            $teamStats = $db->query("
                SELECT u.id,
                       CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS full_name,
                       u.username,
                       COUNT(DISTINCT ta.task_id)                                      AS tasks_assigned,
                       SUM(CASE WHEN t.status = 'COMPLETADA' THEN 1 ELSE 0 END)        AS tasks_done,
                       COALESCE(
                           (SELECT SUM(tl2.hours)
                            FROM task_time_logs tl2
                            WHERE tl2.user_id = u.id AND tl2.work_date >= ?),
                           0
                       )                                                                AS hours_week
                FROM users u
                JOIN task_assignees ta ON ta.user_id = u.id
                JOIN tasks          t  ON t.id = ta.task_id
                JOIN sprints        s  ON s.id = t.sprint_id
                JOIN projects       p  ON p.id = s.project_id
                WHERE p.is_active = 1
                  AND u.is_active = 1
                  AND (
                      p.director_id = ?
                      OR EXISTS (
                          SELECT 1 FROM project_members pm_t
                          WHERE pm_t.project_id = p.id AND pm_t.user_id = ?
                      )
                  )
                GROUP BY u.id, u.first_name, u.last_name, u.username
                ORDER BY tasks_assigned DESC
                LIMIT 10
            ", [$weekStart, $userId, $userId])->getResultArray();
            foreach ($teamStats as &$ts2) {
                $ts2['tasks_assigned'] = (int) $ts2['tasks_assigned'];
                $ts2['tasks_done']     = (int) $ts2['tasks_done'];
                $ts2['hours_week']     = round((float) $ts2['hours_week'], 1);
            }
            unset($ts2);
        }

        return $this->response->setJSON([
            'tasks_summary'    => $taskStats,
            'urgent_tasks'     => $urgentTasks,
            'my_projects'      => $myProjects,
            'hours_this_week'  => round($hoursWeek, 1),
            'completed_week'   => $completedWeek,
            'alerts'           => array_slice($alerts, 0, 5),
            'recent_activity'  => $activity,
            'hours_per_day'    => $hoursPerDay,
            'priority_dist'    => $priorityDist,
            'project_progress' => $projectProgress,
            'team_stats'       => $teamStats,
            'is_manager'       => $isManager,
        ]);
    }
}
