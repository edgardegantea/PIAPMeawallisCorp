<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Eventos del mes: tareas con due_date + hitos en los proyectos del usuario.
 */
class CalendarController extends BaseController
{
    public function index(): ResponseInterface
    {
        $userId = Auth::id();
        $db     = Database::connect();
        $year   = (int) ($this->request->getGet('year')  ?? date('Y'));
        $month  = (int) ($this->request->getGet('month') ?? date('m'));

        // Tasks assigned to the user due in the requested month
        $tasks = $db->query("
            SELECT t.id, t.title, t.status, t.priority, t.due_date,
                   p.id AS project_id, p.name AS project_name, p.code AS project_code,
                   'task' AS item_type, 0 AS is_completed
            FROM tasks t
            JOIN sprints s ON s.id = t.sprint_id
            JOIN projects p ON p.id = s.project_id
            WHERE t.assigned_to = ?
              AND t.due_date IS NOT NULL
              AND YEAR(t.due_date) = ?
              AND MONTH(t.due_date) = ?
              AND p.is_active = 1
            ORDER BY t.due_date ASC
        ", [$userId, $year, $month])->getResultArray();

        // Milestones in the user's projects due in the requested month
        $milestones = $db->query("
            SELECT m.id, m.title, m.due_date, m.is_completed,
                   m.project_id, p.name AS project_name, p.code AS project_code,
                   'milestone' AS item_type, NULL AS status, NULL AS priority
            FROM milestones m
            JOIN projects p ON p.id = m.project_id
            LEFT JOIN project_members pm ON pm.project_id = m.project_id AND pm.user_id = ?
            WHERE m.due_date IS NOT NULL
              AND YEAR(m.due_date) = ?
              AND MONTH(m.due_date) = ?
              AND p.is_active = 1
              AND (p.director_id = ? OR pm.user_id = ?)
            GROUP BY m.id
            ORDER BY m.due_date ASC
        ", [$userId, $year, $month, $userId, $userId])->getResultArray();

        return $this->response->setJSON([
            'tasks'      => $tasks,
            'milestones' => $milestones,
        ]);
    }
}
