<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ActivityLogger;
use App\Libraries\ProjectGate;
use App\Models\RiskModel;
use CodeIgniter\HTTP\ResponseInterface;

class RisksController extends BaseController
{
    private RiskModel $model;

    public function __construct()
    {
        $this->model = new RiskModel();
    }

    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');
        if ($projectId) {
            return $this->response->setJSON($this->model->where('project_id', $projectId)->findAll());
        }
        return $this->response->setJSON($this->model->findAll());
    }

    public function show(int $id): ResponseInterface
    {
        $risk = $this->model->find($id);
        if (!$risk) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Riesgo no encontrado']);
        }
        return $this->response->setJSON($risk);
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = ['project_id' => 'required|integer', 'description' => 'required'];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }
        if (!ProjectGate::canWrite((int) $data['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $id   = $this->model->insert($data);
        $risk = $this->model->find($id);

        ActivityLogger::log(
            (int)$data['project_id'],
            'risk.created',
            'risk',
            (int)$id,
            'Riesgo registrado: ' . ($data['description'] ?? '')
        );

        return $this->response->setStatusCode(201)->setJSON($risk);
    }

    public function update(int $id): ResponseInterface
    {
        $risk = $this->model->find($id);
        if (!$risk) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Riesgo no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $risk['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        $risk = $this->model->find($id);
        if (!$risk) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Riesgo no encontrado']);
        }
        if (!ProjectGate::canWrite((int) $risk['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
