<?php

namespace App\Models;

use CodeIgniter\Model;

class BacklogItemModel extends Model
{
    protected $table         = 'backlog_items';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = [
        'project_id', 'sprint_id', 'epic_id',
        'title', 'description', 'acceptance_criteria',
        'user_role', 'user_action', 'user_benefit',
        'priority', 'story_points', 'status', 'order',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByProject(int $projectId): array
    {
        return $this->where('project_id', $projectId)->orderBy('order', 'ASC')->findAll();
    }
}
