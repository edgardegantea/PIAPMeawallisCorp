<?php

namespace App\Models;

use CodeIgniter\Model;

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

    public function findBySprint(int $sprintId, ?int $assignedTo = null): array
    {
        $db      = \Config\Database::connect();
        $builder = $db->table('tasks t')
            ->select('t.*, u.username as assignee_username, u.first_name as assignee_first_name, u.last_name as assignee_last_name')
            ->join('users u', 'u.id = t.assigned_to', 'left')
            ->where('t.sprint_id', $sprintId)
            ->orderBy('t.status', 'ASC');

        if ($assignedTo !== null) {
            $builder->where('t.assigned_to', $assignedTo);
        }

        return $builder->get()->getResultArray();
    }
}
