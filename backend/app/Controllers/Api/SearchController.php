<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Global full-text search across projects, tasks and milestones.
 *
 * GET /api/search?q=term  (minimum 2 characters)
 *
 * Returns:
 *   {
 *     projects:   [{ id, code, name, status }]          — max 5
 *     tasks:      [{ id, title, status, sprint_id }]    — max 5
 *     milestones: [{ id, title, project_id, project_name }] — max 5
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

        $db   = Database::connect();
        $like = '%' . $q . '%';

        // Projects
        $projects = $db->table('projects')
            ->select('id, code, name, status')
            ->like('name', $q)
            ->orLike('code', $q)
            ->limit(5)
            ->get()->getResultArray();

        // Tasks
        $tasks = $db->table('tasks')
            ->select('id, title, status, sprint_id')
            ->like('title', $q)
            ->orLike('description', $q)
            ->limit(5)
            ->get()->getResultArray();

        // Milestones
        $milestones = $db->table('milestones m')
            ->select('m.id, m.title, m.project_id, p.name as project_name')
            ->join('projects p', 'p.id = m.project_id', 'left')
            ->like('m.title', $q)
            ->orLike('m.description', $q)
            ->limit(5)
            ->get()->getResultArray();

        return $this->response->setJSON([
            'projects'   => $projects,
            'tasks'      => $tasks,
            'milestones' => $milestones,
        ]);
    }
}
