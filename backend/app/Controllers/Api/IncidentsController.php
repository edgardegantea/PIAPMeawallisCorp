<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ActivityLogger;
use App\Libraries\Auth;
use App\Models\IncidentModel;
use CodeIgniter\HTTP\ResponseInterface;

class IncidentsController extends BaseController
{
    private IncidentModel $model;

    public function __construct()
    {
        $this->model = new IncidentModel();
    }

    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');

        $rows = $projectId
            ? $this->model->where('project_id', $projectId)->findAll()
            : $this->model->findAll();

        return $this->response->setJSON($rows);
    }

    public function show(int $id): ResponseInterface
    {
        $incident = $this->model->find($id);

        if (! $incident) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Incidencia no encontrada']);
        }

        return $this->response->setJSON($incident);
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = [
            'project_id'  => 'required|integer',
            'title'       => 'required|max_length[255]',
            'description' => 'required',
        ];

        if (! $this->validate($rules)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $data['reported_by'] = Auth::id();
        $id       = $this->model->insert($data);
        $incident = $this->model->find($id);

        ActivityLogger::log(
            (int)$data['project_id'],
            'incident.created',
            'incident',
            (int)$id,
            'Incidencia creada: ' . ($data['title'] ?? '')
        );

        return $this->response->setStatusCode(201)
            ->setJSON($incident);
    }

    public function update(int $id): ResponseInterface
    {
        $before = $this->model->find($id);
        if (! $before) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Incidencia no encontrada']);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        $after = $this->model->find($id);

        // Log status changes
        if (isset($data['status']) && $data['status'] !== $before['status']) {
            ActivityLogger::log(
                (int)$after['project_id'],
                'incident.status_changed',
                'incident',
                $id,
                'Estado de incidencia cambiado a ' . $data['status'] . ': ' . ($after['title'] ?? '')
            );
        }

        return $this->response->setJSON($after);
    }

    public function delete(int $id): ResponseInterface
    {
        if (! $this->model->find($id)) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Incidencia no encontrada']);
        }

        $this->model->delete($id);

        return $this->response->setStatusCode(204)->setBody('');
    }
}
