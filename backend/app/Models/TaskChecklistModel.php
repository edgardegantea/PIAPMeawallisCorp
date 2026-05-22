<?php

namespace App\Models;

use CodeIgniter\Model;

class TaskChecklistModel extends Model
{
    protected $table         = 'task_checklists';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['task_id', 'text', 'is_done', 'sort_order'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = null; // no updated_at column

    public function findByTask(int $taskId): array
    {
        return $this->where('task_id', $taskId)
            ->orderBy('sort_order', 'ASC')
            ->orderBy('id', 'ASC')
            ->findAll();
    }
}
