<?php

namespace App\Models;

use CodeIgniter\Model;

class RiskModel extends Model
{
    protected $table         = 'risks';
    protected $primaryKey    = 'id';
    protected $returnType    = 'array';
    protected $allowedFields = [
        'project_id', 'description', 'category', 'owner_id',
        'probability', 'impact', 'mitigation_plan', 'response_plan',
        'status', 'due_date',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
