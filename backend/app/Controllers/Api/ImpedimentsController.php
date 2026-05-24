<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\ProjectGate;
use App\Models\ImpedimentModel;
use CodeIgniter\HTTP\ResponseInterface;

class ImpedimentsController extends BaseController
{
    private ImpedimentModel $model;

    public function __construct()
    {
        $this->model = new ImpedimentModel();
    }

    /** GET /api/impediments?project=X&sprint=Y */
    public function index(): ResponseInterface
    {
        $projectId = (int) $this->request->getGet('project');
        if (! $projectId) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'project requerido']);
        }

        $builder = $this->model
            ->select('impediments.*,
                      u1.first_name AS reporter_first, u1.last_name AS reporter_last,
                      u2.first_name AS assignee_first, u2.last_name AS assignee_last,
                      s.name AS sprint_name')
            ->join('users u1', 'u1.id = impediments.reported_by', 'left')
            ->join('users u2', 'u2.id = impediments.assigned_to', 'left')
            ->join('sprints s', 's.id = impediments.sprint_id', 'left')
            ->where('impediments.project_id', $projectId);

        if ($sprintId = $this->request->getGet('sprint')) {
            $builder->where('impediments.sprint_id', (int) $sprintId);
        }
        if ($status = $this->request->getGet('status')) {
            $builder->where('impediments.status', $status);
        }

        return $this->response->setJSON($builder->orderBy('impediments.created_at', 'DESC')->findAll());
    }

    /** POST /api/impediments */
    public function create(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (! $this->validate(['project_id' => 'required|integer', 'title' => 'required|min_length[2]'])) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }
        if (! ProjectGate::canWrite((int) $data['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $id = $this->model->insert([
            'project_id'  => $data['project_id'],
            'sprint_id'   => $data['sprint_id']   ?? null,
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'status'      => $data['status']      ?? 'ABIERTO',
            'priority'    => $data['priority']    ?? 'MEDIA',
            'reported_by' => Auth::id(),
            'assigned_to' => $data['assigned_to'] ?? null,
        ]);

        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    /** PUT /api/impediments/:id */
    public function update(int $id): ResponseInterface
    {
        $imp = $this->model->find($id);
        if (! $imp) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Impedimento no encontrado']);
        }
        if (! ProjectGate::canWrite((int) $imp['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = ['title', 'description', 'status', 'priority', 'assigned_to', 'sprint_id'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (isset($update['status']) && $update['status'] === 'RESUELTO' && $imp['status'] !== 'RESUELTO') {
            $update['resolved_at'] = date('Y-m-d H:i:s');
        }

        $this->model->update($id, $update);
        return $this->response->setJSON($this->model->find($id));
    }

    /** DELETE /api/impediments/:id */
    public function delete(int $id): ResponseInterface
    {
        $imp = $this->model->find($id);
        if (! $imp) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Impedimento no encontrado']);
        }
        if (! ProjectGate::canWrite((int) $imp['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
