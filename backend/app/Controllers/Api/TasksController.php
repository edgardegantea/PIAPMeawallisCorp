<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\ActivityLogger;
use App\Libraries\Auth;
use App\Libraries\ProjectGate;
use App\Models\TaskCommentModel;
use App\Models\TaskModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

class TasksController extends BaseController
{
    private TaskModel $model;

    public function __construct()
    {
        $this->model = new TaskModel();
    }

    public function index(): ResponseInterface
    {
        $sprintId = $this->request->getGet('sprint');
        if (! $sprintId) {
            return $this->response->setJSON($this->model->findAll());
        }

        $assignedTo = $this->resolveTaskFilter((int) $sprintId);
        return $this->response->setJSON($this->model->findBySprint((int) $sprintId, $assignedTo));
    }

    /**
     * Devuelve el user_id para filtrar tareas, o null si puede ver todas.
     * ADMIN, director del proyecto y PM ven todo.
     * Cualquier otro MEMBER solo ve sus propias tareas.
     */
    private function resolveTaskFilter(int $sprintId): ?int
    {
        $user = Auth::user();

        if ($user['role'] === 'ADMIN') {
            return null;
        }

        $userId = Auth::id();
        $db     = Database::connect();

        $row = $db->query(
            'SELECT p.director_id, pm.role AS project_role
             FROM sprints s
             JOIN projects p ON p.id = s.project_id
             LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
             WHERE s.id = ?',
            [$userId, $sprintId]
        )->getRowArray();

        if ($row && ((int) $row['director_id'] === $userId || $row['project_role'] === 'PM')) {
            return null;
        }

        return $userId;
    }

    public function show(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $task = $db->table('tasks t')
            ->select('t.*')
            ->where('t.id', $id)
            ->get()->getRowArray();

        if (!$task) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea no encontrada']);
        }

        // Asignados
        $task['assignees'] = $db->query('
            SELECT ta.user_id, u.first_name, u.last_name, u.username
            FROM task_assignees ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.task_id = ?', [$id])->getResultArray();

        $task['comments']      = (new TaskCommentModel())->findByTask($id);
        $task['comment_count'] = count($task['comments']);

        return $this->response->setJSON($task);
    }

    /**
     * GET /api/tasks/my — tareas asignadas al usuario autenticado.
     */
    public function myTasks(): ResponseInterface
    {
        $userId = Auth::id();
        $db     = Database::connect();
        $status = $this->request->getGet('status');

        $sql = "
            SELECT t.*,
                   s.name     AS sprint_name,
                   s.number   AS sprint_number,
                   p.id       AS project_id,
                   p.name     AS project_name,
                   p.code     AS project_code
            FROM tasks t
            JOIN sprints  s ON s.id = t.sprint_id
            JOIN projects p ON p.id = s.project_id
            WHERE EXISTS (
                SELECT 1 FROM task_assignees ta
                WHERE ta.task_id = t.id AND ta.user_id = ?
            )
            AND p.is_active = 1
        ";
        $params = [$userId];

        if ($status) {
            $sql    .= ' AND t.status = ?';
            $params[] = $status;
        } else {
            $sql .= " AND t.status != 'COMPLETADA'";
        }

        $sql .= "
            ORDER BY
              CASE t.priority
                WHEN 'CRITICA' THEN 1
                WHEN 'ALTA'    THEN 2
                WHEN 'MEDIA'   THEN 3
                ELSE 4 END,
              t.due_date ASC,
              t.id       ASC
        ";

        $tasks = $db->query($sql, $params)->getResultArray();

        if (!empty($tasks)) {
            $ids       = implode(',', array_column($tasks, 'id'));
            $assignees = $db->query("
                SELECT ta.task_id, u.id AS user_id, u.first_name, u.last_name, u.username
                FROM task_assignees ta
                JOIN users u ON u.id = ta.user_id
                WHERE ta.task_id IN ({$ids})
            ")->getResultArray();

            $byTask = [];
            foreach ($assignees as $a) {
                $byTask[$a['task_id']][] = $a;
            }
            foreach ($tasks as &$t) {
                $t['assignees'] = $byTask[$t['id']] ?? [];
            }
            unset($t);
        }

        return $this->response->setJSON($tasks);
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = ['sprint_id' => 'required|integer', 'title' => 'required|max_length[255]'];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $projectId = ProjectGate::projectIdFromSprint((int) $data['sprint_id']);
        if ($projectId && !ProjectGate::canWrite($projectId)) {
            return ProjectGate::deny($this->response);
        }

        // Extraer assignees antes de insertar
        $assigneeIds = isset($data['assignees']) ? array_values(array_filter((array) $data['assignees'], 'is_numeric')) : [];
        unset($data['assignees']);

        // Mantener assigned_to = primer asignado (retrocompat)
        if (!empty($assigneeIds) && empty($data['assigned_to'])) {
            $data['assigned_to'] = (int) $assigneeIds[0];
        }

        $id   = $this->model->insert($data);
        $this->syncAssignees((int) $id, $assigneeIds);

        $task             = $this->model->find($id);
        $task['assignees'] = $this->getAssignees((int) $id);

        // Activity log
        if (!empty($task['sprint_id'])) {
            $db     = Database::connect();
            $sprint = $db->table('sprints')->select('project_id')->where('id', $task['sprint_id'])->get()->getRowArray();
            if ($sprint) {
                ActivityLogger::log(
                    (int) $sprint['project_id'],
                    'task.created',
                    'task',
                    (int) $id,
                    'Tarea creada: ' . ($task['title'] ?? '')
                );
            }
        }

        return $this->response->setStatusCode(201)->setJSON($task);
    }

    public function update(int $id): ResponseInterface
    {
        $task = $this->model->find($id);
        if (!$task) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea no encontrada']);
        }

        // TEAM_MEMBER solo puede editar tareas donde esté asignado
        $userId    = Auth::id();
        $projectId = ProjectGate::projectIdFromTask($id);
        if ($projectId && !ProjectGate::canWrite($projectId)) {
            $isAssigned = (int) $task['assigned_to'] === $userId;
            if (!$isAssigned) {
                $db         = Database::connect();
                $isAssigned = (bool) $db->table('task_assignees')
                    ->where('task_id', $id)->where('user_id', $userId)
                    ->countAllResults();
            }
            if (!$isAssigned) {
                return ProjectGate::deny($this->response);
            }
        }

        $before      = $task;
        $data        = $this->request->getJSON(true) ?? $this->request->getPost();
        $assigneeIds = null;

        if (isset($data['assignees'])) {
            $assigneeIds = array_values(array_filter((array) $data['assignees'], 'is_numeric'));
            unset($data['assignees']);
        }

        $this->model->update($id, $data);

        if ($assigneeIds !== null) {
            $this->syncAssignees($id, $assigneeIds);
        }

        $after             = $this->model->find($id);
        $after['assignees'] = $this->getAssignees($id);

        // Log status changes
        if (isset($data['status']) && $data['status'] !== $before['status']) {
            $db     = Database::connect();
            $sprint = $db->table('sprints')->select('project_id')->where('id', $after['sprint_id'])->get()->getRowArray();
            if ($sprint) {
                ActivityLogger::log(
                    (int) $sprint['project_id'],
                    'task.status_changed',
                    'task',
                    $id,
                    'Estado de tarea cambiado a ' . $data['status'] . ': ' . ($after['title'] ?? '')
                );
            }
        }

        return $this->response->setJSON($after);
    }

    public function delete(int $id): ResponseInterface
    {
        if (!$this->model->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea no encontrada']);
        }

        $projectId = ProjectGate::projectIdFromTask($id);
        if ($projectId && !ProjectGate::canWrite($projectId)) {
            return ProjectGate::deny($this->response);
        }

        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Sincroniza task_assignees y mantiene assigned_to = primer asignado.
     */
    private function syncAssignees(int $taskId, array $userIds): void
    {
        $db = Database::connect();
        $db->table('task_assignees')->where('task_id', $taskId)->delete();

        if (!empty($userIds)) {
            $rows = array_map(fn($uid) => ['task_id' => $taskId, 'user_id' => (int) $uid], $userIds);
            $db->table('task_assignees')->insertBatch($rows);
            $this->model->update($taskId, ['assigned_to' => (int) $userIds[0]]);
        } else {
            $this->model->update($taskId, ['assigned_to' => null]);
        }
    }

    /** Devuelve el array de asignados de una tarea. */
    private function getAssignees(int $taskId): array
    {
        return Database::connect()->query('
            SELECT ta.user_id, u.first_name, u.last_name, u.username
            FROM task_assignees ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.task_id = ?', [$taskId])->getResultArray();
    }
}
