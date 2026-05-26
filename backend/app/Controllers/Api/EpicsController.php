<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Libraries\ProjectGate;
use App\Models\EpicModel;
use App\Models\BacklogItemModel;
use CodeIgniter\HTTP\ResponseInterface;

class EpicsController extends BaseController
{
    private EpicModel $model;

    public function __construct()
    {
        $this->model = new EpicModel();
    }

    /** GET /api/epics?project=X */
    public function index(): ResponseInterface
    {
        $projectId = (int) $this->request->getGet('project');
        if (! $projectId) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'project requerido']);
        }

        $epics = $this->model->where('project_id', $projectId)->orderBy('created_at', 'DESC')->findAll();

        // Agregar conteo de backlog items por épica
        $backlogModel = new BacklogItemModel();
        foreach ($epics as &$epic) {
            $epic['backlog_count'] = $backlogModel->where('epic_id', $epic['id'])->countAllResults();
        }

        return $this->response->setJSON($epics);
    }

    /** POST /api/epics */
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
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'color'       => $data['color']       ?? '#6366f1',
            'status'      => $data['status']      ?? 'ABIERTA',
            'priority'    => $data['priority']    ?? 'MEDIA',
            'created_by'  => Auth::id(),
        ]);

        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    /** PUT /api/epics/:id */
    public function update(int $id): ResponseInterface
    {
        $epic = $this->model->find($id);
        if (! $epic) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Épica no encontrada']);
        }
        if (! ProjectGate::canWrite((int) $epic['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = ['title', 'description', 'color', 'status', 'priority'];
        $this->model->update($id, array_intersect_key($data, array_flip($allowed)));

        return $this->response->setJSON($this->model->find($id));
    }

    /** DELETE /api/epics/:id */
    public function delete(int $id): ResponseInterface
    {
        $epic = $this->model->find($id);
        if (! $epic) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Épica no encontrada']);
        }
        if (! ProjectGate::canWrite((int) $epic['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        // Desasociar backlog items antes de eliminar
        $this->db->query('UPDATE backlog_items SET epic_id = NULL WHERE epic_id = ?', [$id]);
        $this->model->delete($id);

        return $this->response->setStatusCode(204)->setBody('');
    }
}
