<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * Subtasks (tasks with parent_task_id set).
 *
 * GET    /tasks/:id/subtasks
 * POST   /tasks/:id/subtasks   { title, status?, priority?, due_date?, assigned_to? }
 * PATCH  /subtasks/:id         (same as regular task update — reuses TasksController logic, kept separate for clarity)
 * DELETE /subtasks/:id
 */
class SubtasksController extends BaseController
{
    public function index(int $parentId): ResponseInterface
    {
        $db = Database::connect();

        $rows = $db->query("
            SELECT t.*,
                   (SELECT COUNT(*) FROM task_assignees ta WHERE ta.task_id = t.id) AS assignee_count,
                   (SELECT SUM(tl.hours) FROM time_logs tl WHERE tl.task_id = t.id) AS time_logged
            FROM tasks t
            WHERE t.parent_task_id = ?
            ORDER BY t.id ASC
        ", [$parentId])->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function create(int $parentId): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        // Inherit sprint_id from parent
        $parent = $db->table('tasks')->where('id', $parentId)->get()->getRowArray();
        if (!$parent) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Tarea padre no encontrada']);
        }

        $title = trim($data['title'] ?? '');
        if (!$title) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'Título requerido']);
        }

        $db->table('tasks')->insert([
            'sprint_id'      => $parent['sprint_id'],
            'parent_task_id' => $parentId,
            'title'          => $title,
            'status'         => $data['status']   ?? 'PENDIENTE',
            'priority'       => $data['priority'] ?? 'MEDIA',
            'due_date'       => $data['due_date'] ?? null,
            'created_at'     => date('Y-m-d H:i:s'),
            'updated_at'     => date('Y-m-d H:i:s'),
        ]);

        $id = $db->insertID();

        $row = $db->table('tasks')->where('id', $id)->get()->getRowArray();
        return $this->response->setStatusCode(201)->setJSON($row);
    }

    public function update(int $id): ResponseInterface
    {
        $db   = Database::connect();
        $data = $this->request->getJSON(true);

        $allowed = ['title', 'status', 'priority', 'due_date', 'due_time', 'description'];
        $payload = array_intersect_key($data, array_flip($allowed));
        $payload['updated_at'] = date('Y-m-d H:i:s');

        $db->table('tasks')->where('id', $id)->update($payload);
        $row = $db->table('tasks')->where('id', $id)->get()->getRowArray();
        return $this->response->setJSON($row);
    }

    public function delete(int $id): ResponseInterface
    {
        Database::connect()->table('tasks')->where('id', $id)->delete();
        return $this->response->setStatusCode(204)->setBody('');
    }
}
