<?php

namespace App\Models;

use CodeIgniter\Model;

class ActivityLogModel extends Model
{
    protected $table         = 'activity_logs';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['project_id', 'user_id', 'action', 'entity_type', 'entity_id', 'description'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = null; // no updated_at column

    public function findByProject(int $projectId, int $limit = 50): array
    {
        return $this->db->table('activity_logs al')
            ->select('al.*, u.username, u.first_name, u.last_name')
            ->join('users u', 'u.id = al.user_id', 'left')
            ->where('al.project_id', $projectId)
            ->orderBy('al.created_at', 'DESC')
            ->limit($limit)
            ->get()->getResultArray();
    }

    public function findByProjectAndUser(int $projectId, int $userId, int $limit = 50): array
    {
        return $this->db->table('activity_logs al')
            ->select('al.*, u.username, u.first_name, u.last_name')
            ->join('users u', 'u.id = al.user_id', 'left')
            ->where('al.project_id', $projectId)
            ->where('al.user_id', $userId)
            ->orderBy('al.created_at', 'DESC')
            ->limit($limit)
            ->get()->getResultArray();
    }
}
