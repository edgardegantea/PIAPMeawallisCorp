<?php

namespace App\Models;

use CodeIgniter\Model;

class UserAchievementModel extends Model
{
    protected $table         = 'user_achievements';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'user_id', 'title', 'description', 'achievement_date', 'created_at',
    ];

    public function findByUser(int $userId): array
    {
        return $this->where('user_id', $userId)
                    ->orderBy('achievement_date', 'DESC')
                    ->findAll();
    }
}
