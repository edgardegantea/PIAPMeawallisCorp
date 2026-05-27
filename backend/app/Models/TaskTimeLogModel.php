<?php

namespace App\Models;

use CodeIgniter\Model;
use Config\Database;

class TaskTimeLogModel extends Model
{
    protected $table         = 'task_time_logs';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['task_id', 'user_id', 'hours', 'work_date', 'description'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = '';   // sin columna updated_at — cadena vacía deshabilita el campo

    public function findByTask(int $taskId): array
    {
        $db = Database::connect();
        return $db->query("
            SELECT tl.id, tl.task_id, tl.user_id, tl.hours, tl.work_date,
                   tl.description, tl.created_at,
                   u.username, u.first_name, u.last_name
            FROM task_time_logs tl
            LEFT JOIN users u ON u.id = tl.user_id
            WHERE tl.task_id = ?
            ORDER BY tl.work_date DESC, tl.id DESC
        ", [$taskId])->getResultArray();
    }

    public function sumHoursForTask(int $taskId): float
    {
        $db  = Database::connect();
        $row = $db->query(
            'SELECT COALESCE(SUM(hours), 0) AS total FROM task_time_logs WHERE task_id = ?',
            [$taskId]
        )->getRow();

        return $row ? (float) $row->total : 0.0;
    }
}
