<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\ProjectMemberModel;
use CodeIgniter\HTTP\ResponseInterface;

class MembersController extends BaseController
{
    private ProjectMemberModel $model;

    public function __construct()
    {
        $this->model = new ProjectMemberModel();
    }

    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');
        if ($projectId) {
            return $this->response->setJSON($this->model->findByProject((int)$projectId));
        }
        return $this->response->setJSON($this->model->findAll());
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = ['project_id' => 'required|integer', 'user_id' => 'required|integer'];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $exists = $this->model->where('project_id', $data['project_id'])
                              ->where('user_id', $data['user_id'])->first();
        if ($exists) {
            return $this->response->setStatusCode(409)->setJSON(['message' => 'El usuario ya es miembro del proyecto']);
        }

        $data['assigned_at'] = date('Y-m-d H:i:s');
        $id = $this->model->insert($data);
        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        if (!$this->model->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Miembro no encontrado']);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, ['role' => $data['role'] ?? 'DESARROLLADOR']);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        if (!$this->model->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Miembro no encontrado']);
        }
        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }

    /** GET /api/admin/teams — all project memberships for the permissions panel */
    public function allTeams(): ResponseInterface
    {
        $db   = \Config\Database::connect();
        $rows = $db->query(
            'SELECT pm.id, pm.project_id, pm.user_id,
                    pm.role            AS project_role,
                    pm.assigned_at,
                    u.username,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.role             AS system_role,
                    u.department,
                    p.name             AS project_name,
                    p.code             AS project_code,
                    p.status           AS project_status
             FROM   project_members pm
             JOIN   users    u ON u.id = pm.user_id
             JOIN   projects p ON p.id = pm.project_id
             WHERE  p.is_active = 1
             ORDER  BY p.name ASC, u.last_name ASC, u.first_name ASC'
        )->getResultArray();

        return $this->response->setJSON($rows);
    }
}
