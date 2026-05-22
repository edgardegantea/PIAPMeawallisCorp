<?php

namespace App\Models;

use CodeIgniter\Model;

class MilestoneModel extends Model
{
    protected $table         = 'milestones';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = [
        'project_id', 'title', 'description',
        'due_date', 'is_completed', 'completed_at', 'order',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByProject(int $projectId): array
    {
        return $this->where('project_id', $projectId)
            ->orderBy('order', 'ASC')
            ->orderBy('due_date', 'ASC')
            ->findAll();
    }
}
