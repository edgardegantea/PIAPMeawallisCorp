<?php

namespace App\Models;

use CodeIgniter\Model;

class ProjectMemberModel extends Model
{
    protected $table         = 'project_members';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['project_id', 'user_id', 'role', 'assigned_at'];
    protected $useTimestamps = false;

    public function findByProject(int $projectId): array
    {
        $db = \Config\Database::connect();
        return $db->table('project_members pm')
            ->select('pm.*, u.username, u.email, u.first_name, u.last_name, u.position')
            ->join('users u', 'u.id = pm.user_id', 'left')
            ->where('pm.project_id', $projectId)
            ->get()->getResultArray();
    }
}
