<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\TaskModel;
use App\Models\TaskTimeLogModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Detailed time tracking per task.
 *
 * GET    /api/tasks/:taskId/timelogs
 * POST   /api/tasks/:taskId/timelogs
 * PATCH  /api/timelogs/:id   (only own logs)
 * DELETE /api/timelogs/:id   (only own logs)
 *
 * Creating or deleting a log recalculates tasks.time_logged.
 */
class TimeLogsController extends BaseController
{
    private TaskTimeLogModel $model;
    private TaskModel        $taskModel;

    public function __construct()
    {
        $this->model     = new TaskTimeLogModel();
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
        $rules = [
            'hours'     => 'required|decimal|greater_than[0]',
            'work_date' => 'required|valid_date',
        ];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $data['task_id'] = $taskId;
        $data['user_id'] = Auth::id();

        $id = $this->model->insert($data);

        // Recalculate task's time_logged
        $this->syncTimeLogged($taskId);

        return $this->response->setStatusCode(201)->setJSON($this->model->findByTask($taskId)[0] ?? $this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        $log = $this->model->find($id);
        if (!$log) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Registro no encontrado']);
        }

        if ((int)$log['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'No autorizado']);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = array_intersect_key($data, array_flip(['hours', 'work_date', 'description']));

        if (empty($allowed)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Nada que actualizar']);
        }

        $this->model->update($id, $allowed);

        // Recalculate after update
        $this->syncTimeLogged((int)$log['task_id']);

        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        $log = $this->model->find($id);
        if (!$log) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Registro no encontrado']);
        }

        if ((int)$log['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'No autorizado']);
        }

        $taskId = (int)$log['task_id'];
        $this->model->delete($id);

        // Recalculate after deletion
        $this->syncTimeLogged($taskId);

        return $this->response->setStatusCode(204)->setBody('');
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function syncTimeLogged(int $taskId): void
    {
        $total = $this->model->sumHoursForTask($taskId);
        $this->taskModel->update($taskId, ['time_logged' => $total]);
    }
}
