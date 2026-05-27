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

        $data = $this->request->getJSON(true);
        if (empty($data) || !is_array($data)) {
            $data = $this->request->getPost() ?: [];
        }

        // Validación explícita en PHP para evitar problemas de tipos con CI4
        $hours    = isset($data['hours']) ? (float) $data['hours'] : 0;
        $workDate = trim((string) ($data['work_date'] ?? ''));

        if ($hours <= 0) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Las horas deben ser mayores a 0']);
        }
        if (!$workDate || strtotime($workDate) === false) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'Fecha de trabajo inválida']);
        }

        $insert = [
            'task_id'     => $taskId,
            'user_id'     => Auth::id(),
            'hours'       => round($hours, 2),
            'work_date'   => date('Y-m-d', strtotime($workDate)),
            'description' => mb_substr(trim((string) ($data['description'] ?? '')), 0, 500) ?: null,
        ];

        try {
            $id = $this->model->insert($insert);
            if (!$id) {
                return $this->response->setStatusCode(500)
                    ->setJSON(['message' => 'No se pudo insertar el registro de tiempo']);
            }

            // Recalculate task's time_logged
            $this->syncTimeLogged($taskId);

            $logs = $this->model->findByTask($taskId);
            $new  = count($logs) ? $logs[0] : $this->model->find($id);

            return $this->response->setStatusCode(201)->setJSON($new);
        } catch (\Throwable $e) {
            log_message('error', '[TimeLogsController::create] ' . $e->getMessage() . ' | ' . $e->getFile() . ':' . $e->getLine());
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al guardar el tiempo: ' . $e->getMessage()]);
        }
    }

    public function update(int $id): ResponseInterface
    {
        $log = $this->model->find($id);
        if (!$log) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Registro no encontrado']);
        }

        if ((int) $log['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'No autorizado']);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = [];

        if (isset($data['hours'])) {
            $h = round((float) $data['hours'], 2);
            if ($h > 0) $allowed['hours'] = $h;
        }
        if (isset($data['work_date'])) {
            $allowed['work_date'] = date('Y-m-d', strtotime($data['work_date']));
        }
        if (array_key_exists('description', $data)) {
            $allowed['description'] = mb_substr(trim((string) $data['description']), 0, 500) ?: null;
        }

        if (empty($allowed)) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Nada que actualizar']);
        }

        try {
            $this->model->update($id, $allowed);
            $this->syncTimeLogged((int) $log['task_id']);
            return $this->response->setJSON($this->model->find($id));
        } catch (\Throwable $e) {
            log_message('error', '[TimeLogsController::update] ' . $e->getMessage());
            return $this->response->setStatusCode(500)->setJSON(['message' => $e->getMessage()]);
        }
    }

    public function delete(int $id): ResponseInterface
    {
        $log = $this->model->find($id);
        if (!$log) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Registro no encontrado']);
        }

        if ((int) $log['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'No autorizado']);
        }

        $taskId = (int) $log['task_id'];

        try {
            $this->model->delete($id);
            $this->syncTimeLogged($taskId);
            return $this->response->setStatusCode(204)->setBody('');
        } catch (\Throwable $e) {
            log_message('error', '[TimeLogsController::delete] ' . $e->getMessage());
            return $this->response->setStatusCode(500)->setJSON(['message' => $e->getMessage()]);
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function syncTimeLogged(int $taskId): void
    {
        $total = $this->model->sumHoursForTask($taskId);
        $this->taskModel->update($taskId, ['time_logged' => $total]);
    }
}
