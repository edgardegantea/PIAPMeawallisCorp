<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\ActivityLogModel;
use App\Models\ProjectModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Audit trail / activity feed per project.
 *
 * GET /api/projects/:projectId/activity
 *   - ADMIN / DIRECTOR / project manager → full feed
 *   - TEAM_MEMBER → only their own entries
 */
class ActivityController extends BaseController
{
    private ActivityLogModel $model;
    private ProjectModel     $projectModel;

    public function __construct()
    {
        $this->model        = new ActivityLogModel();
        $this->projectModel = new ProjectModel();
    }

    public function index(int $projectId): ResponseInterface
    {
        if (!$this->projectModel->find($projectId)) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Proyecto no encontrado']);
        }

        $user   = Auth::user();
        $userId = Auth::id();

        // For TEAM_MEMBER check if they are a manager (director or PM) in this project
        $isManager = in_array($user['role'], ['ADMIN', 'DIRECTOR'], true);

        if (!$isManager) {
            $db  = \Config\Database::connect();
            $row = $db->query(
                'SELECT p.director_id, pm.role AS project_role
                 FROM   projects p
                 LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
                 WHERE  p.id = ?',
                [$userId, $projectId]
            )->getRowArray();

            if ($row && ((int) $row['director_id'] === $userId || $row['project_role'] === 'PM')) {
                $isManager = true;
            }
        }

        $logs = $isManager
            ? $this->model->findByProject($projectId, 50)
            : $this->model->findByProjectAndUser($projectId, $userId, 50);

        return $this->response->setJSON($logs);
    }

    /**
     * PUT /api/activity/{id}
     * Solo el autor puede editar su propio mensaje.
     */
    public function update(int $id): ResponseInterface
    {
        $log = $this->model->find($id);
        if (!$log) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Entrada no encontrada']);
        }
        if ((int) $log['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'Solo puedes editar tus propios mensajes']);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        if (empty(trim($data['description'] ?? ''))) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'El mensaje no puede estar vacío']);
        }

        $this->model->update($id, ['description' => trim($data['description'])]);
        return $this->response->setJSON($this->model->find($id));
    }

    /**
     * DELETE /api/activity/{id}
     * Solo el autor puede eliminar su propio mensaje.
     */
    public function delete(int $id): ResponseInterface
    {
        $log = $this->model->find($id);
        if (!$log) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Entrada no encontrada']);
        }
        if ((int) $log['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'Solo puedes eliminar tus propios mensajes']);
        }

        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
