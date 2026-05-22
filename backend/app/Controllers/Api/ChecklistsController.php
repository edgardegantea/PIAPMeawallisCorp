<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\TaskChecklistModel;
use App\Models\TaskModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Trello-style checklist items attached to a task.
 *
 * GET    /api/tasks/:taskId/checklists
 * POST   /api/tasks/:taskId/checklists
 * PATCH  /api/checklists/:id
 * DELETE /api/checklists/:id
 */
class ChecklistsController extends BaseController
{
    private TaskChecklistModel $model;
    private TaskModel          $taskModel;

    public function __construct()
    {
        $this->model     = new TaskChecklistModel();
        $this->taskModel = new TaskModel();
    }

    public function index(int $taskId): ResponseInterface
    {
        if (!$this->taskModel->find($taskId)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea no encontrada']);
        }
        return $this->response->setJSON($this->model->findByTask($taskId));
    }

    public function create(int $taskId): ResponseInterface
    {
        if (!$this->taskModel->find($taskId)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea no encontrada']);
        }

        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = ['text' => 'required|max_length[500]'];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $data['task_id'] = $taskId;

        // Auto sort_order: place at the end
        if (!isset($data['sort_order'])) {
            $last = $this->model->where('task_id', $taskId)->orderBy('sort_order', 'DESC')->first();
            $data['sort_order'] = $last ? (int)$last['sort_order'] + 1 : 0;
        }

        $id = $this->model->insert($data);
        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        $item = $this->model->find($id);
        if (!$item) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Elemento no encontrado']);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        // Only allow updating text, is_done, sort_order
        $allowed = array_intersect_key($data, array_flip(['text', 'is_done', 'sort_order']));
        if (empty($allowed)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Nada que actualizar']);
        }

        $this->model->update($id, $allowed);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        if (!$this->model->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Elemento no encontrado']);
        }
        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
