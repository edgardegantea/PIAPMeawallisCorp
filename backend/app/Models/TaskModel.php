<?php

namespace App\Models;

use CodeIgniter\Model;
use Config\Database;

class TaskModel extends Model
{
    protected $table         = 'tasks';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = [
        'sprint_id', 'backlog_item_id', 'title', 'description',
        'assigned_to', 'status', 'estimated_hours',
        'priority', 'due_date', 'time_logged', 'labels',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Devuelve todas las tareas de un sprint con su array de asignados.
     * Si $userId no es null, filtra por tareas donde ese usuario está asignado.
     */
    public function findBySprint(int $sprintId, ?int $userId = null): array
    {
        $db      = Database::connect();
        $builder = $db->table('tasks t')
            ->select('t.*')
            ->where('t.sprint_id', $sprintId)
            ->orderBy('t.status', 'ASC');

        if ($userId !== null) {
            $builder->where(
                "EXISTS (SELECT 1 FROM task_assignees ta_f
                          WHERE ta_f.task_id = t.id AND ta_f.user_id = {$userId})"
            );
        }

        $tasks = $builder->get()->getResultArray();

        if (empty($tasks)) {
            return [];
        }

        // Cargar asignados en bloque (una sola query para todos los tasks)
        $ids       = implode(',', array_column($tasks, 'id'));
        $assignees = $db->query("
            SELECT ta.task_id, u.id AS user_id,
                   u.first_name, u.last_name, u.username
            FROM task_assignees ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.task_id IN ({$ids})
            ORDER BY ta.task_id
        ")->getResultArray();

        $byTask = [];
        foreach ($assignees as $a) {
            $byTask[$a['task_id']][] = $a;
        }

        foreach ($tasks as &$task) {
            $task['assignees'] = $byTask[$task['id']] ?? [];
        }
        unset($task);

        return $tasks;
    }
}
