<?php

namespace App\Models;

use CodeIgniter\Model;

class TaskTimeLogModel extends Model
{
    protected $table         = 'task_time_logs';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['task_id', 'user_id', 'hours', 'work_date', 'description'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = null; // no updated_at column

    public function findByTask(int $taskId): array
    {
        return $this->db->table('task_time_logs tl')
            ->select('tl.*, u.username, u.first_name, u.last_name')
            ->join('users u', 'u.id = tl.user_id', 'left')
            ->where('tl.task_id', $taskId)
            ->orderBy('tl.work_date', 'DESC')
            ->orderBy('tl.id', 'DESC')
            ->get()->getResultArray();
    }

    public function sumHoursForTask(int $taskId): float
    {
        $result = $this->selectSum('hours')->where('task_id', $taskId)->first();
        return $result ? (float)($result['hours'] ?? 0) : 0.0;
    }
}
