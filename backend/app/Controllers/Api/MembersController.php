<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\MailService;
use App\Libraries\ProjectGate;
use App\Models\ProjectMemberModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

class MembersController extends BaseController
{
    private ProjectMemberModel $model;

    public function __construct()
    {
        $this->model = new ProjectMemberModel();
    }

    public function index(): ResponseInterface
    {
        $user      = Auth::user();
        $projectId = $this->request->getGet('project');

        // TEAM_MEMBER solo puede ver miembros de proyectos donde él mismo participa
        if ($user['role'] === 'TEAM_MEMBER') {
            if ($projectId) {
                // Verificar que el TEAM_MEMBER pertenece a este proyecto
                $isMember = $this->model
                    ->where('project_id', (int) $projectId)
                    ->where('user_id',    (int) $user['id'])
                    ->first();

                if (! $isMember) {
                    return $this->response->setStatusCode(403)
                        ->setJSON(['message' => 'No tienes acceso a los miembros de este proyecto']);
                }

                return $this->response->setJSON($this->model->findByProject((int) $projectId));
            }

            // Sin project_id: devolver solo miembros de sus propios proyectos
            $myProjectIds = array_column(
                $this->model->select('project_id')->where('user_id', (int) $user['id'])->findAll(),
                'project_id'
            );

            if (empty($myProjectIds)) {
                return $this->response->setJSON([]);
            }

            return $this->response->setJSON(
                $this->model->whereIn('project_id', $myProjectIds)->findAll()
            );
        }

        // Otros roles: acceso completo
        if ($projectId) {
            return $this->response->setJSON($this->model->findByProject((int) $projectId));
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
        if (!ProjectGate::canWrite((int) $data['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $exists = $this->model->where('project_id', $data['project_id'])
                              ->where('user_id', $data['user_id'])->first();
        if ($exists) {
            return $this->response->setStatusCode(409)->setJSON(['message' => 'El usuario ya es miembro del proyecto']);
        }

        $data['assigned_at'] = date('Y-m-d H:i:s');
        $id = $this->model->insert($data);

        // Notificar al usuario recién incorporado (no bloqueante)
        try {
            $db      = Database::connect();
            $invUser = (new UserModel())->find((int) $data['user_id']);
            $project = $db->table('projects')->select('id, name, code')->where('id', $data['project_id'])->get()->getRowArray();
            if ($invUser && $project) {
                MailService::sendProjectInvite($invUser, $project, $data['role'] ?? '');
            }
        } catch (\Throwable $e) {
            log_message('error', '[MembersController] invite email error: ' . $e->getMessage());
        }

        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        $member = $this->model->find($id);
        if (!$member) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Miembro no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $member['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, ['role' => $data['role'] ?? 'DESARROLLADOR']);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        $member = $this->model->find($id);
        if (!$member) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Miembro no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $member['project_id'])) {
            return ProjectGate::deny($this->response);
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
