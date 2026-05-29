<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Global full-text search across projects, tasks, milestones and users.
 *
 * GET /api/search?q=term  (minimum 2 characters)
 *
 * Returns:
 *   {
 *     projects:   [{ id, code, name, status }]                         — max 5
 *     tasks:      [{ id, title, status, sprint_id, project_id }]       — max 5
 *     milestones: [{ id, title, project_id, project_name }]            — max 5
 *     users:      [{ id, username, first_name, last_name, role }]      — max 4
 *   }
 */
class SearchController extends BaseController
{
    public function index(): ResponseInterface
    {
        $q = trim((string)$this->request->getGet('q'));

        if (mb_strlen($q) < 2) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El término de búsqueda debe tener al menos 2 caracteres']);
        }

        $db = Database::connect();

        // Projects
        $projects = $db->table('projects')
            ->select('id, code, name, status')
            ->groupStart()
                ->like('name', $q)
                ->orLike('code', $q)
                ->orLike('description', $q)
            ->groupEnd()
            ->where('is_active', 1)
            ->limit(5)
            ->get()->getResultArray();

        // Tasks (include project_id via sprint join for correct navigation)
        $tasks = $db->query("
            SELECT t.id, t.title, t.status, t.sprint_id,
                   s.project_id, p.code AS project_code
            FROM tasks t
            JOIN sprints  s ON s.id = t.sprint_id
            JOIN projects p ON p.id = s.project_id
            WHERE (t.title LIKE ? OR t.description LIKE ?)
              AND p.is_active = 1
            LIMIT 5
        ", ["%{$q}%", "%{$q}%"])->getResultArray();

        // Milestones
        $milestones = $db->table('milestones m')
            ->select('m.id, m.title, m.project_id, p.name as project_name')
            ->join('projects p', 'p.id = m.project_id', 'left')
            ->groupStart()
                ->like('m.title', $q)
                ->orLike('m.description', $q)
            ->groupEnd()
            ->limit(5)
            ->get()->getResultArray();

        // Users (active only, exclude password)
        $users = $db->table('users')
            ->select('id, username, first_name, last_name, role, position')
            ->groupStart()
                ->like('username',   $q)
                ->orLike('first_name', $q)
                ->orLike('last_name',  $q)
                ->orLike('email',      $q)
            ->groupEnd()
            ->where('is_active', 1)
            ->limit(4)
            ->get()->getResultArray();

        return $this->response->setJSON([
            'projects'   => $projects,
            'tasks'      => $tasks,
            'milestones' => $milestones,
            'users'      => $users,
        ]);
    }
}
