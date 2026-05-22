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
 *   hours_estimated, hours_logged
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

        // Fetch all members of the project with their user data
        $members = $db->table('project_members pm')
            ->select('u.id as user_id, u.first_name, u.last_name, u.username, pm.role')
            ->join('users u', 'u.id = pm.user_id')
            ->where('pm.project_id', $projectId)
            ->get()->getResultArray();

        if (empty($members)) {
            return $this->response->setJSON([]);
        }

        // Collect all user ids for the IN clause
        $userIds = array_column($members, 'user_id');

        // Aggregate task counts and hours for all members in a single query
        $taskRows = $db->table('tasks t')
            ->select([
                't.assigned_to as user_id',
                'COUNT(*) as tasks_total',
                "SUM(t.status = 'done') as tasks_done",
                "SUM(t.status = 'in_progress') as tasks_in_progress",
                "SUM(t.status = 'pending') as tasks_pending",
                "SUM(t.status = 'blocked') as tasks_blocked",
                'SUM(COALESCE(t.estimated_hours, 0)) as hours_estimated',
                'SUM(COALESCE(t.time_logged, 0)) as hours_logged',
            ])
            ->join('sprints s', 's.id = t.sprint_id')
            ->where('s.project_id', $projectId)
            ->whereIn('t.assigned_to', $userIds)
            ->groupBy('t.assigned_to')
            ->get()->getResultArray();

        // Index task stats by user_id
        $tasksByUser = [];
        foreach ($taskRows as $row) {
            $tasksByUser[(int)$row['user_id']] = $row;
        }

        // Build result
        $result = [];
        foreach ($members as $member) {
            $uid   = (int)$member['user_id'];
            $stats = $tasksByUser[$uid] ?? [];

            $result[] = [
                'user_id'           => $uid,
                'first_name'        => $member['first_name'],
                'last_name'         => $member['last_name'],
                'username'          => $member['username'],
                'role'              => $member['role'],
                'tasks_total'       => (int)($stats['tasks_total'] ?? 0),
                'tasks_done'        => (int)($stats['tasks_done'] ?? 0),
                'tasks_in_progress' => (int)($stats['tasks_in_progress'] ?? 0),
                'tasks_pending'     => (int)($stats['tasks_pending'] ?? 0),
                'tasks_blocked'     => (int)($stats['tasks_blocked'] ?? 0),
                'hours_estimated'   => (float)($stats['hours_estimated'] ?? 0),
                'hours_logged'      => (float)($stats['hours_logged'] ?? 0),
            ];
        }

        return $this->response->setJSON($result);
    }
}
