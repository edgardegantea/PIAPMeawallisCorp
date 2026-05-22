<?php

namespace App\Models;

use CodeIgniter\Model;

class SprintModel extends Model
{
    protected $table         = 'sprints';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = ['project_id', 'number', 'name', 'goal', 'start_date', 'end_date', 'capacity', 'status'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByProject(int $projectId): array
    {
        return $this->where('project_id', $projectId)->orderBy('number', 'ASC')->findAll();
    }
}
