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

        return $this->response->setJSON([
            'tasks_summary'   => $taskStats,
            'urgent_tasks'    => $urgentTasks,
            'my_projects'     => $myProjects,
            'hours_this_week' => round($hoursWeek, 1),
            'completed_week'  => $completedWeek,
            'alerts'          => array_slice($alerts, 0, 5),
            'recent_activity' => $activity,
        ]);
    }
}
