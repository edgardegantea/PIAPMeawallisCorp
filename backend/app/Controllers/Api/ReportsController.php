<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

class ReportsController extends BaseController
{
    /**
     * GET /api/reports/overview
     * Resumen ejecutivo de toda la organización.
     */
    public function overview(): ResponseInterface
    {
        $db = Database::connect();

        // Proyectos
        $projects = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'EJECUCION' THEN 1 ELSE 0 END) as en_ejecucion,
                SUM(CASE WHEN status = 'CIERRE' THEN 1 ELSE 0 END) as cerrados,
                SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END) as cancelados,
                SUM(CASE WHEN planned_end_date < CURDATE() AND status NOT IN ('CIERRE','CANCELADO') THEN 1 ELSE 0 END) as vencidos,
                COALESCE(SUM(planned_budget), 0) as presupuesto_total,
                COALESCE(SUM(actual_budget), 0) as presupuesto_ejecutado,
                ROUND(AVG(completion_percentage), 1) as avance_promedio
            FROM projects WHERE is_active = 1
        ")->getRowArray();

        // Tareas
        $tasks = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN status = 'EN_PROGRESO' THEN 1 ELSE 0 END) as en_progreso,
                SUM(CASE WHEN status = 'BLOQUEADA' THEN 1 ELSE 0 END) as bloqueadas,
                SUM(CASE WHEN status = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN due_date < CURDATE() AND status != 'COMPLETADA' THEN 1 ELSE 0 END) as vencidas,
                COALESCE(SUM(estimated_hours), 0) as horas_estimadas,
                COALESCE(SUM(time_logged), 0) as horas_registradas
            FROM tasks
        ")->getRowArray();

        // Hitos
        $milestones = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(is_completed) as completados,
                SUM(CASE WHEN due_date < CURDATE() AND is_completed = 0 THEN 1 ELSE 0 END) as vencidos
            FROM milestones
        ")->getRowArray();

        // Riesgos
        $risks = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN probability = 'ALTA' AND impact = 'ALTO' THEN 1 ELSE 0 END) as criticos,
                SUM(CASE WHEN status = 'ACTIVO' THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN status = 'MITIGADO' THEN 1 ELSE 0 END) as mitigados
            FROM risks
        ")->getRowArray();

        // Incidencias
        $incidents = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN severity = 'CRITICA' THEN 1 ELSE 0 END) as criticas,
                SUM(CASE WHEN status = 'ABIERTA' THEN 1 ELSE 0 END) as abiertas
            FROM incidents
        ")->getRowArray();

        // Proyectos por estado
        $byStatus = $db->query("
            SELECT status, COUNT(*) as count
            FROM projects WHERE is_active = 1
            GROUP BY status ORDER BY count DESC
        ")->getResultArray();

        // Proyectos por categoría
        $byCategory = $db->query("
            SELECT pc.name as category, pc.color, COUNT(p.id) as count
            FROM projects p
            JOIN project_categories pc ON pc.id = p.category_id
            WHERE p.is_active = 1
            GROUP BY pc.id ORDER BY count DESC
        ")->getResultArray();

        // Top 5 proyectos por progreso descendente
        $topProjects = $db->query("
            SELECT p.id, p.code, p.name, p.status, p.completion_percentage,
                   p.planned_end_date, pc.name as category_name, pc.color as category_color
            FROM projects p
            LEFT JOIN project_categories pc ON pc.id = p.category_id
            WHERE p.is_active = 1
            ORDER BY p.completion_percentage DESC
            LIMIT 5
        ")->getResultArray();

        // Progreso de horas por proyecto (últimos 6 meses de actividad)
        $hoursByProject = $db->query("
            SELECT p.name, COALESCE(SUM(t.estimated_hours), 0) as estimadas,
                   COALESCE(SUM(t.time_logged), 0) as registradas
            FROM projects p
            LEFT JOIN sprints s ON s.project_id = p.id
            LEFT JOIN tasks t ON t.sprint_id = s.id
            WHERE p.is_active = 1
            GROUP BY p.id
            HAVING estimadas > 0
            ORDER BY estimadas DESC
            LIMIT 8
        ")->getResultArray();

        return $this->response->setJSON([
            'projects'        => $projects,
            'tasks'           => $tasks,
            'milestones'      => $milestones,
            'risks'           => $risks,
            'incidents'       => $incidents,
            'by_status'       => $byStatus,
            'by_category'     => $byCategory,
            'top_projects'    => $topProjects,
            'hours_by_project'=> $hoursByProject,
        ]);
    }

    /**
     * GET /api/reports/project/{id}
     * Reporte detallado de un proyecto específico.
     */
    public function project(int $id): ResponseInterface
    {
        $db = Database::connect();

        $project = $db->table('projects p')
            ->select('p.*, pc.name as category_name, pc.color as category_color,
                      u1.first_name as director_first_name, u1.last_name as director_last_name,
                      u2.first_name as sponsor_first_name, u2.last_name as sponsor_last_name')
            ->join('project_categories pc', 'pc.id = p.category_id', 'left')
            ->join('users u1', 'u1.id = p.director_id', 'left')
            ->join('users u2', 'u2.id = p.sponsor_id', 'left')
            ->where('p.id', $id)
            ->get()->getRowArray();

        if (!$project) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Proyecto no encontrado']);
        }

        // Sprints summary
        $sprints = $db->query("
            SELECT s.id, s.name, s.number, s.status, s.start_date, s.end_date,
                   COUNT(t.id) as total_tasks,
                   SUM(CASE WHEN t.status = 'COMPLETADA' THEN 1 ELSE 0 END) as completed_tasks,
                   COALESCE(SUM(t.estimated_hours), 0) as estimated_hours,
                   COALESCE(SUM(t.time_logged), 0) as time_logged
            FROM sprints s
            LEFT JOIN tasks t ON t.sprint_id = s.id
            WHERE s.project_id = ?
            GROUP BY s.id
            ORDER BY s.number
        ", [$id])->getResultArray();

        // Tasks by status + priority
        $taskStats = $db->query("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN t.status = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN t.status = 'EN_PROGRESO' THEN 1 ELSE 0 END) as en_progreso,
                SUM(CASE WHEN t.status = 'BLOQUEADA' THEN 1 ELSE 0 END) as bloqueadas,
                SUM(CASE WHEN t.priority = 'CRITICA' THEN 1 ELSE 0 END) as criticas,
                SUM(CASE WHEN t.due_date < CURDATE() AND t.status != 'COMPLETADA' THEN 1 ELSE 0 END) as vencidas,
                COALESCE(SUM(t.estimated_hours), 0) as horas_estimadas,
                COALESCE(SUM(t.time_logged), 0) as horas_registradas
            FROM tasks t
            JOIN sprints s ON s.id = t.sprint_id
            WHERE s.project_id = ?
        ", [$id])->getRowArray();

        // Milestones
        $milestones = $db->query("
            SELECT id, title, due_date, is_completed, completed_at, `order`
            FROM milestones WHERE project_id = ?
            ORDER BY `order`
        ", [$id])->getResultArray();

        // Risks
        $risks = $db->query("
            SELECT id, description, probability, impact, status, mitigation_plan
            FROM risks WHERE project_id = ?
            ORDER BY created_at DESC
        ", [$id])->getResultArray();

        // Incidents
        $incidents = $db->query("
            SELECT id, title, severity, status, created_at
            FROM incidents WHERE project_id = ?
            ORDER BY created_at DESC
        ", [$id])->getResultArray();

        // Team
        $members = $db->query("
            SELECT pm.role, pm.assigned_at, u.first_name, u.last_name, u.email, u.position
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = ?
        ", [$id])->getResultArray();

        // Backlog
        $backlog = $db->query("
            SELECT status, COUNT(*) as count
            FROM backlog_items WHERE project_id = ?
            GROUP BY status
        ", [$id])->getResultArray();

        return $this->response->setJSON([
            'project'    => $project,
            'sprints'    => $sprints,
            'task_stats' => $taskStats,
            'milestones' => $milestones,
            'risks'      => $risks,
            'incidents'  => $incidents,
            'members'    => $members,
            'backlog'    => $backlog,
        ]);
    }

    /**
     * GET /api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Métricas de actividad para un período específico.
     */
    public function range(): ResponseInterface
    {
        $from = $this->request->getGet('from') ?: date('Y-m-01');
        $to   = $this->request->getGet('to')   ?: date('Y-m-d');

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Formato inválido (YYYY-MM-DD)']);
        }

        $db = Database::connect();

        // Tareas creadas en el período
        $tasksCreated = $db->query("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas,
                   SUM(CASE WHEN priority = 'CRITICA' THEN 1 ELSE 0 END) as criticas,
                   COALESCE(SUM(estimated_hours), 0) as horas_estimadas
            FROM tasks
            WHERE DATE(created_at) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        // Tareas marcadas como completadas en el período
        $tasksCompleted = $db->query("
            SELECT COUNT(*) as total,
                   COALESCE(SUM(estimated_hours), 0) as horas_estimadas,
                   COALESCE(SUM(time_logged), 0) as horas_registradas
            FROM tasks
            WHERE status = 'COMPLETADA' AND DATE(updated_at) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        // Horas registradas en el período (task_time_logs)
        $hours = $db->query("
            SELECT COALESCE(SUM(hours), 0) as total_horas,
                   COUNT(DISTINCT user_id) as usuarios_activos,
                   COUNT(*) as registros
            FROM task_time_logs
            WHERE DATE(work_date) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        // Horas por usuario en el período
        $hoursByUser = $db->query("
            SELECT u.first_name, u.last_name, u.username, u.role, u.department,
                   COALESCE(SUM(tl.hours), 0) as horas,
                   COUNT(DISTINCT tl.task_id) as tareas
            FROM task_time_logs tl
            JOIN users u ON u.id = tl.user_id
            WHERE DATE(tl.work_date) BETWEEN ? AND ?
            GROUP BY u.id
            ORDER BY horas DESC
            LIMIT 10
        ", [$from, $to])->getResultArray();

        // Proyectos creados en el período
        $projectsCreated = $db->query("
            SELECT COUNT(*) as total,
                   COALESCE(SUM(planned_budget), 0) as presupuesto
            FROM projects
            WHERE DATE(created_at) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        // Riesgos registrados en el período
        $risksCreated = $db->query("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN probability = 'ALTA' AND impact = 'ALTO' THEN 1 ELSE 0 END) as criticos
            FROM risks
            WHERE DATE(created_at) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        // Incidencias en el período
        $incidentsCreated = $db->query("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN severity = 'CRITICA' THEN 1 ELSE 0 END) as criticas,
                   SUM(CASE WHEN status = 'RESUELTA' THEN 1 ELSE 0 END) as resueltas
            FROM incidents
            WHERE DATE(created_at) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        // Tareas completadas por proyecto en el período
        $tasksByProject = $db->query("
            SELECT p.name as project, p.code,
                   COUNT(t.id) as completadas,
                   COALESCE(SUM(t.time_logged), 0) as horas
            FROM tasks t
            JOIN sprints s ON s.id = t.sprint_id
            JOIN projects p ON p.id = s.project_id
            WHERE t.status = 'COMPLETADA' AND DATE(t.updated_at) BETWEEN ? AND ?
            GROUP BY p.id
            ORDER BY completadas DESC
            LIMIT 8
        ", [$from, $to])->getResultArray();

        // Nuevos miembros incorporados en el período
        $membersAdded = $db->query("
            SELECT COUNT(*) as total
            FROM project_members
            WHERE DATE(assigned_at) BETWEEN ? AND ?
        ", [$from, $to])->getRowArray();

        return $this->response->setJSON([
            'period'            => ['from' => $from, 'to' => $to],
            'tasks_created'     => $tasksCreated,
            'tasks_completed'   => $tasksCompleted,
            'hours'             => $hours,
            'hours_by_user'     => $hoursByUser,
            'projects_created'  => $projectsCreated,
            'risks_created'     => $risksCreated,
            'incidents_created' => $incidentsCreated,
            'tasks_by_project'  => $tasksByProject,
            'members_added'     => $membersAdded,
        ]);
    }

    /**
     * GET /reports/time
     * Detalle de timelogs por usuario/proyecto con totales.
     * Params: project_id, user_id, from (YYYY-MM-DD), to (YYYY-MM-DD)
     */
    public function time(): ResponseInterface
    {
        $db        = Database::connect();
        $projectId = $this->request->getGet('project_id');
        $userId    = $this->request->getGet('user_id');
        $from      = $this->request->getGet('from') ?: date('Y-m-01');
        $to        = $this->request->getGet('to')   ?: date('Y-m-d');

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Formato inválido (YYYY-MM-DD)']);
        }

        $params = [$from, $to];
        $where  = 'WHERE tl.work_date BETWEEN ? AND ?';

        if ($projectId) { $where .= ' AND s.project_id = ?'; $params[] = (int)$projectId; }
        if ($userId)    { $where .= ' AND tl.user_id = ?';   $params[] = (int)$userId; }

        // Detailed rows
        $rows = $db->query("
            SELECT
                tl.id,
                tl.work_date,
                tl.hours,
                tl.description,
                u.id         AS user_id,
                CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                u.email,
                t.id         AS task_id,
                t.title      AS task_title,
                t.status     AS task_status,
                p.id         AS project_id,
                p.name       AS project_name,
                p.code       AS project_code
            FROM task_time_logs tl
            JOIN users    u  ON u.id  = tl.user_id
            JOIN tasks    t  ON t.id  = tl.task_id
            JOIN sprints  s  ON s.id  = t.sprint_id
            JOIN projects p  ON p.id  = s.project_id
            {$where}
            ORDER BY tl.work_date DESC, tl.id DESC
        ", $params)->getResultArray();

        // Totals by user
        $byUser = [];
        foreach ($rows as $r) {
            $uid = $r['user_id'];
            if (!isset($byUser[$uid])) {
                $byUser[$uid] = [
                    'user_id'   => $uid,
                    'user_name' => $r['user_name'],
                    'email'     => $r['email'],
                    'total_hours' => 0,
                    'entries'   => 0,
                ];
            }
            $byUser[$uid]['total_hours'] += (float)$r['hours'];
            $byUser[$uid]['entries']++;
        }

        // Totals by project
        $byProject = [];
        foreach ($rows as $r) {
            $pid = $r['project_id'];
            if (!isset($byProject[$pid])) {
                $byProject[$pid] = [
                    'project_id'   => $pid,
                    'project_name' => $r['project_name'],
                    'project_code' => $r['project_code'],
                    'total_hours'  => 0,
                    'entries'      => 0,
                ];
            }
            $byProject[$pid]['total_hours'] += (float)$r['hours'];
            $byProject[$pid]['entries']++;
        }

        $grandTotal = array_sum(array_column($rows, 'hours'));

        return $this->response->setJSON([
            'period'      => ['from' => $from, 'to' => $to],
            'grand_total' => round($grandTotal, 2),
            'rows'        => $rows,
            'by_user'     => array_values($byUser),
            'by_project'  => array_values($byProject),
        ]);
    }
}
