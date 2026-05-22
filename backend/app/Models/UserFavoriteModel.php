<?php

namespace App\Models;

use CodeIgniter\Model;

class UserFavoriteModel extends Model
{
    protected $table         = 'user_favorites';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['user_id', 'project_id'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = null; // no updated_at column

    public function findByUser(int $userId): array
    {
        return $this->where('user_id', $userId)->findAll();
    }

    public function findOne(int $userId, int $projectId): ?array
    {
        return $this->where('user_id', $userId)->where('project_id', $projectId)->first();
    }
}
