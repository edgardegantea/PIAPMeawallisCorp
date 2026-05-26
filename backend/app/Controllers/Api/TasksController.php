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
     * Returns the user_id to filter tasks by, or null if the caller can see all tasks.
     * ADMINs, the project director, and project PMs see everything.
     * Any other MEMBER only sees their own assigned tasks.
     */
    private function resolveTaskFilter(int $sprintId): ?int
    {
        $user = \App\Libraries\Auth::user();

        if ($user['role'] === 'ADMIN') {
            return null;
        }

        $userId = \App\Libraries\Auth::id();
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
            ->select('t.*, u.username as assignee_username, u.first_name as assignee_first_name, u.last_name as assignee_last_name')
            ->join('users u', 'u.id = t.assigned_to', 'left')
            ->where('t.id', $id)
            ->get()->getRowArray();

        if (!$task) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea no encontrada']);
        }

        $task['comments'] = (new TaskCommentModel())->findByTask($id);
        $task['comment_count'] = count($task['comments']);

        return $this->response->setJSON($task);
    }

    /**
     * GET /api/tasks/my — tareas asignadas al usuario autenticado (todos los proyectos).
     * Acepta ?status=PENDIENTE|EN_PROGRESO|BLOQUEADA|COMPLETADA (opcional).
     */
    public function myTasks(): ResponseInterface
    {
        $userId = Auth::id();
        $db     = Database::connect();
        $status = $this->request->getGet('status');

        $sql    = "
            SELECT t.*,
                   s.name     AS sprint_name,
                   s.number   AS sprint_number,
                   p.id       AS project_id,
                   p.name     AS project_name,
                   p.code     AS project_code,
                   u.first_name AS assignee_first_name,
                   u.last_name  AS assignee_last_name
            FROM   tasks t
            JOIN   sprints  s ON s.id  = t.sprint_id
            JOIN   projects p ON p.id  = s.project_id
            LEFT JOIN users u ON u.id  = t.assigned_to
            WHERE  t.assigned_to = ?
              AND  p.is_active   = 1
        ";
        $params = [$userId];

        if ($status) {
            $sql   .= ' AND t.status = ?';
            $params[] = $status;
        } else {
            $sql   .= " AND t.status != 'COMPLETADA'";
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

        $id   = $this->model->insert($data);
        $task = $this->model->find($id);

        // Activity log — resolve project_id via sprint
        if (!empty($task['sprint_id'])) {
            $db     = Database::connect();
            $sprint = $db->table('sprints')->select('project_id')->where('id', $task['sprint_id'])->get()->getRowArray();
            if ($sprint) {
                ActivityLogger::log(
                    (int)$sprint['project_id'],
                    'task.created',
                    'task',
                    (int)$id,
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

        // TEAM_MEMBER may update only their own assigned tasks
        $userId    = Auth::id();
        $projectId = ProjectGate::projectIdFromTask($id);
        if ($projectId && !ProjectGate::canWrite($projectId)) {
            if ((int) $task['assigned_to'] !== $userId) {
                return ProjectGate::deny($this->response);
            }
        }

        $before = $this->model->find($id);
        $data   = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        $after  = $this->model->find($id);

        // Log status changes
        if (isset($data['status']) && $data['status'] !== $before['status']) {
            $db     = Database::connect();
            $sprint = $db->table('sprints')->select('project_id')->where('id', $after['sprint_id'])->get()->getRowArray();
            if ($sprint) {
                ActivityLogger::log(
                    (int)$sprint['project_id'],
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
}
