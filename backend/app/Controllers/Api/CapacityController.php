<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Sprint capacity planning.
 *
 * GET  /api/sprints/:id/capacity
 * POST /api/sprints/:id/capacity   { user_id, available_hours, notes }
 */
class CapacityController extends BaseController
{
    public function index(int $sprintId): ResponseInterface
    {
        $db = Database::connect();

        // Members of the sprint's project
        $members = $db->query("
            SELECT u.id AS user_id, u.first_name, u.last_name, u.username,
                   COALESCE(sc.available_hours, 40) AS available_hours,
                   sc.notes,
                   COALESCE(SUM(t.estimated_hours),0) AS assigned_hours,
                   COALESCE(SUM(t.story_points),0)    AS assigned_points
            FROM sprints sp
            JOIN project_members pm ON pm.project_id = sp.project_id
            JOIN users u ON u.id = pm.user_id
            LEFT JOIN sprint_capacity sc ON sc.sprint_id = ? AND sc.user_id = u.id
            LEFT JOIN task_assignees ta ON ta.user_id = u.id
            LEFT JOIN tasks t ON t.id = ta.task_id AND t.sprint_id = ?
            WHERE sp.id = ?
            GROUP BY u.id, sc.available_hours, sc.notes
            ORDER BY u.first_name
        ", [$sprintId, $sprintId, $sprintId])->getResultArray();

        $totalAvailable = array_sum(array_column($members, 'available_hours'));
        $totalAssigned  = array_sum(array_column($members, 'assigned_hours'));

        return $this->response->setJSON([
            'members'        => $members,
            'total_available'=> (float)$totalAvailable,
            'total_assigned' => (float)$totalAssigned,
            'utilization_pct'=> $totalAvailable > 0 ? round(($totalAssigned / $totalAvailable) * 100) : 0,
        ]);
    }

    public function upsert(int $sprintId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        $userId = (int)($data['user_id'] ?? 0);
        $hours  = (float)($data['available_hours'] ?? 40);
        $notes  = $data['notes'] ?? null;

        $existing = $db->table('sprint_capacity')
            ->where('sprint_id', $sprintId)->where('user_id', $userId)->get()->getRowArray();

        if ($existing) {
            $db->table('sprint_capacity')
                ->where('sprint_id', $sprintId)->where('user_id', $userId)
                ->update(['available_hours' => $hours, 'notes' => $notes]);
        } else {
            $db->table('sprint_capacity')->insert([
                'sprint_id'       => $sprintId,
                'user_id'         => $userId,
                'available_hours' => $hours,
                'notes'           => $notes,
            ]);
        }

        return $this->response->setJSON(['ok' => true]);
    }
}
