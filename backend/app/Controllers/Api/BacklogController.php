<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ProjectGate;
use App\Models\BacklogItemModel;
use CodeIgniter\HTTP\ResponseInterface;

class BacklogController extends BaseController
{
    private BacklogItemModel $model;

    public function __construct()
    {
        $this->model = new BacklogItemModel();
    }

    public function index(): ResponseInterface
    {
        $projectId = $this->request->getGet('project');
        if ($projectId) {
            return $this->response->setJSON($this->model->findByProject((int)$projectId));
        }
        return $this->response->setJSON($this->model->findAll());
    }

    public function show(int $id): ResponseInterface
    {
        $item = $this->model->find($id);
        if (!$item) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Historia no encontrada']);
        }
        return $this->response->setJSON($item);
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = ['project_id' => 'required|integer', 'title' => 'required|max_length[255]'];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }
        if (!ProjectGate::canWrite((int) $data['project_id'])) {
            return ProjectGate::deny($this->response);
        }

        $id = $this->model->insert($data);
        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        $item = $this->model->find($id);
        if (!$item) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Historia no encontrada']);
        }
        if (!ProjectGate::canWrite((int) $item['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        $item = $this->model->find($id);
        if (!$item) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Historia no encontrada']);
        }
        if (!ProjectGate::canWrite((int) $item['project_id'])) {
            return ProjectGate::deny($this->response);
        }
        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
