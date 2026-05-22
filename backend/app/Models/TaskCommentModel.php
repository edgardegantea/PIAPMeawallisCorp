<?php

namespace App\Models;

use CodeIgniter\Model;

class TaskCommentModel extends Model
{
    protected $table         = 'task_comments';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['task_id', 'user_id', 'body'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Devuelve los comentarios de una tarea con datos del autor.
     */
    public function findByTask(int $taskId): array
    {
        return $this->db->table('task_comments tc')
            ->select('tc.*, u.username, u.first_name, u.last_name')
            ->join('users u', 'u.id = tc.user_id', 'left')
            ->where('tc.task_id', $taskId)
            ->orderBy('tc.created_at', 'ASC')
            ->get()->getResultArray();
    }
}
